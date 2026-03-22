# NFR Design Patterns — backend

---

## Pattern 1: Cache-Aside（J-Quantsメタデータキャッシュ）

**対応NFR**: NFR-PERF-03（24時間キャッシュ）

**問題**: J-Quants APIへの毎回のリクエストはレイテンシーが高く、レート制限のリスクもある。

**解決策**:
```
リクエスト時:
  1. SQLite の stock_meta_cache を確認
  2. キャッシュヒット（cachedAt が24時間以内）→ そのまま返す
  3. キャッシュミス → J-Quants APIを呼び出し → SQLiteに保存 → 返す

キャッシュ粒度: 銘柄コード単位（1銘柄 = 1行）
TTL: 24時間（cachedAt + 24h > now）
部分ヒット: キャッシュにない銘柄コードのみAPIに問い合わせる
```

**実装クラス**: `JQuantsApiClient`（キャッシュ確認・更新を内包）

---

## Pattern 2: Graceful Degradation / Fallback（外部API障害対応）

**対応NFR**: NFR-AVAIL-01/02/03

**問題**: J-Quants・Google Docs APIは外部サービスであり、障害・未設定時にアプリ全体を停止させてはならない。

**解決策**:

```
J-Quants API:
  try {
    return jQuantsApiClient.fetchMetadata(tickerCodes)
  } catch (Exception e) {
    log.warn("J-Quants API unavailable: {}", e.getMessage())  // トークン値は除く
    return Collections.emptyList()  // 空リストで継続
  }
  → EnrichedHolding.stockMeta = null として処理を継続

Google Docs API:
  try {
    return googleDocsArchiveService.archive(...)
  } catch (Exception e) {
    log.warn("Google Docs archive failed: {}", e.getMessage())
    warnings.add("Google Docs へのアーカイブに失敗しました")
    return null  // インポート自体は成功扱い
  }
```

**実装箇所**: `ImportOrchestrationService` のステップ3・7

---

## Pattern 3: Timeout（外部API呼び出し）

**対応NFR**: NFR-PERF-02/04

**問題**: 外部APIの応答遅延がインポート全体をブロックする。

**解決策**: Spring WebClient のタイムアウト設定

```java
// J-Quants API: 5秒
WebClient.builder()
    .baseUrl(JQUANTS_BASE_URL)
    .clientConnector(new ReactorClientHttpConnector(
        HttpClient.create()
            .responseTimeout(Duration.ofSeconds(5))
    ))
    .build()

// Google Docs API: 10秒
// Google API Client Library の HttpRequestInitializer でタイムアウト設定
```

タイムアウト時は Pattern 2 の Fallback に委譲する。

---

## Pattern 4: Global Exception Handler（フェイルクローズ）

**対応NFR**: SECURITY-15

**問題**: 未処理の例外がスタックトレースをユーザーに露出させたり、不正な状態でリクエストを完了させる恐れがある。

**解決策**: Spring `@ControllerAdvice` によるグローバルエラーハンドラー

```
例外の種類            → HTTPステータス  → レスポンスBody
CsvParseException    → 400 Bad Request → { "error": "CSVの形式が正しくありません" }
PathSecurityException→ 400 Bad Request → { "error": "無効なファイルパスです" }
JQuantsNotConf...    → 200 OK + warning → （インポート継続）
RuntimeException     → 500 Internal    → { "error": "処理中にエラーが発生しました" }
```

スタックトレース・内部パス・フレームワーク情報は一切含めない（SECURITY-09）。

---

## Pattern 5: Security Filter Chain（HTTPセキュリティヘッダー + CORS）

**対応NFR**: SECURITY-04/08

**問題**: フロントエンド（Vue.js）からのリクエストのみを許可し、セキュリティヘッダーをすべてのレスポンスに付与する必要がある。

**解決策**: Spring Security の SecurityFilterChain

```
フィルター処理順（リクエスト）:
  1. CORS フィルター → localhost:5173 のみ許可
  2. CSRF 無効化（REST API・ステートレス）
  3. 認証フィルター 無効化（個人ツール・認証不要）

フィルター処理順（レスポンス）:
  1. Content-Security-Policy: default-src 'self'
  2. Strict-Transport-Security: max-age=31536000; includeSubDomains
  3. X-Content-Type-Options: nosniff
  4. X-Frame-Options: DENY
  5. Referrer-Policy: strict-origin-when-cross-origin
```

---

## Pattern 6: Guard Clause（パストラバーサル防止）

**対応NFR**: SECURITY-05（Q1で「厳格に検証する」を選択）

**問題**: ユーザーが入力したCSVファイルパスに `../../` 等が含まれると、コンテナ外のファイルを読み込む可能性がある。

**解決策**: 正規化後の絶対パスが許可ディレクトリ配下であることを確認

```java
void validateCsvPath(String inputPath) {
    Path normalized = Paths.get(inputPath).toAbsolutePath().normalize();
    Path allowedRoot = Paths.get(allowedDirectory).toAbsolutePath().normalize();

    if (!normalized.startsWith(allowedRoot)) {
        throw new PathSecurityException("パスが許可されたディレクトリ外です");
    }
    if (!normalized.toString().endsWith(".csv")) {
        throw new PathSecurityException("CSVファイル以外は指定できません");
    }
    if (!Files.exists(normalized)) {
        throw new CsvNotFoundException("ファイルが見つかりません: " + normalized.getFileName());
    }
}
```

`allowedDirectory` は環境変数 `CSV_ALLOWED_DIR`（デフォルト: `/data`）から取得。

---

## Pattern 7: Secrets Externalization（機密情報の外部化）

**対応NFR**: SECURITY-12

**問題**: J-Quantsトークン・サービスアカウントキーパスをコードやSQLiteに埋め込むと漏洩リスクがある。

**解決策**: 環境変数からの直接取得

```java
// JQuantsApiClient
String refreshToken = System.getenv("JQUANTS_REFRESH_TOKEN");
// → null/空の場合は JQuantsNotConfiguredException をスロー → Fallbackへ

// GoogleDocsArchiveService
String keyPath = System.getenv("GOOGLE_SA_KEY_PATH");
// → null/空の場合はアーカイブをスキップ
```

**ログ出力禁止**: トークン・キーパスの値をログに含めない（ファイル名のみ可）。

---

## Pattern 8: Structured Logging（構造化ログ）

**対応NFR**: SECURITY-03

**問題**: アドホックなログ出力では機密情報の混入・ログの検索性低下のリスクがある。

**解決策**: SLF4J + Logback、フォーマット統一

```
ログフォーマット:
  [timestamp] [level] [requestId] [logger] message

例:
  2026-03-23T10:15:30Z INFO  [abc123] c.p.csv.CsvParserService - CSV parsed: 32 holdings
  2026-03-23T10:15:31Z WARN  [abc123] c.p.jquants.JQuantsApiClient - J-Quants API timeout

ログレベル制御: 環境変数 LOG_LEVEL（デフォルト: INFO）
```

機密フィールドのマスク対象: `token`, `key`, `password`, `secret` を含む変数名。
