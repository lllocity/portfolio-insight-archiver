# Logical Components — backend

NFRパターンを実現するための論理コンポーネント定義。

---

## LC-01: JQuantsIdTokenCache（インメモリキャッシュ）

**目的**: J-Quants IDトークンをアプリ内メモリに保持し、不要な再認証を防ぐ

**実装方針**:
- Spring Bean（`@Component`・`@Scope("singleton")`）としてDIコンテナに登録
- フィールドで `idToken: String` と `expiresAt: Instant` を保持
- スレッドセーフ: `synchronized` または `AtomicReference` で保護

**配置**: `jquants` パッケージ内の `JQuantsIdTokenCache.java`

```
JQuantsIdTokenCache
  + getToken(): Optional<String>      // 有効期限内なら返す、期限切れはEmpty
  + storeToken(token, expiresAt): void
  + invalidate(): void
```

---

## LC-02: StockMetaCache（SQLiteキャッシュ）

**目的**: J-Quantsから取得した銘柄メタデータを24時間SQLiteにキャッシュ

**実装方針**:
- `stock_meta_cache` テーブルをそのまま利用（`StockMetaCacheRepository`）
- キャッシュ確認ロジックは `JQuantsApiClient` 内に実装

**キャッシュ戦略**:
```
fetchMetadata(tickerCodes):
  hits   = stock_meta_cache WHERE ticker_code IN (tickerCodes)
             AND cached_at > now() - 24h
  misses = tickerCodes - hits.keys

  if misses is not empty:
    fetched = callJQuantsApi(misses)
    upsert fetched into stock_meta_cache

  return hits + fetched
```

---

## LC-03: SecurityFilterChain（Spring Security）

**目的**: CORS制限・セキュリティヘッダー付与・認証無効化を一元管理

**実装クラス**: `SecurityConfig.java`（`security` パッケージ）

```
Bean: SecurityFilterChain
  - CORS: allowedOrigins = ["http://localhost:5173"]
          allowedMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
          allowCredentials = false
  - CSRF: disabled（REST API・ステートレス）
  - 認証: disabled（個人ツール）
  - ヘッダー:
      Content-Security-Policy: default-src 'self'
      Strict-Transport-Security: max-age=31536000; includeSubDomains
      X-Content-Type-Options: nosniff
      X-Frame-Options: DENY
      Referrer-Policy: strict-origin-when-cross-origin
  - Actuator: /actuator/health のみ公開
```

---

## LC-04: GlobalExceptionHandler（@ControllerAdvice）

**目的**: 全コントローラーの未処理例外を一元ハンドリングし、安全なレスポンスを返す

**実装クラス**: `GlobalExceptionHandler.java`（`common.exception` パッケージ）

```
@ControllerAdvice
GlobalExceptionHandler
  @ExceptionHandler(CsvParseException)       → 400 { "error": "CSVの形式が正しくありません" }
  @ExceptionHandler(CsvNotFoundException)    → 400 { "error": "CSVファイルが見つかりません" }
  @ExceptionHandler(PathSecurityException)   → 400 { "error": "無効なファイルパスです" }
  @ExceptionHandler(SettingsValidException)  → 400 { "error": "入力値が正しくありません" }
  @ExceptionHandler(Exception)               → 500 { "error": "処理中にエラーが発生しました" }

  全ケース共通:
    - スタックトレースをログに記録（ERROR level）
    - レスポンスにスタックトレース・内部情報を含めない
```

---

## LC-05: CsvPathValidator（パストラバーサル防止）

**目的**: ユーザー入力のCSVパスを検証し、許可ディレクトリ外へのアクセスを防ぐ

**実装クラス**: `CsvPathValidator.java`（`csv` パッケージ）

```
CsvPathValidator
  + validate(inputPath: String): void  // 違反時は PathSecurityException をスロー

  検証ステップ:
    1. null/blank チェック
    2. Paths.get(inputPath).toAbsolutePath().normalize() で正規化
    3. allowedRoot（環境変数 CSV_ALLOWED_DIR, デフォルト /data）配下か確認
    4. 拡張子 .csv チェック
    5. ファイル存在確認
```

**環境変数**: `CSV_ALLOWED_DIR`（デフォルト: `/data`）

---

## LC-06: ApiErrorResponse（レスポンスDTO）

**目的**: エラーレスポンスの形式を統一する

```java
record ApiErrorResponse(
    String error,          // ユーザー向け汎用メッセージ（内部情報なし）
    String timestamp       // ISO 8601
) {}
```

---

## コンポーネント配置マップ

```
com.portfolio/
  ├── common/
  │   ├── exception/
  │   │   ├── GlobalExceptionHandler.java     ← LC-04
  │   │   ├── CsvParseException.java
  │   │   ├── CsvNotFoundException.java
  │   │   ├── PathSecurityException.java
  │   │   └── ApiErrorResponse.java           ← LC-06
  │   └── security/
  │       └── SecurityConfig.java             ← LC-03
  ├── csv/
  │   └── CsvPathValidator.java               ← LC-05
  └── jquants/
      ├── JQuantsIdTokenCache.java            ← LC-01
      └── StockMetaCacheRepository.java       ← LC-02（既存リポジトリを利用）
```

---

## 環境変数一覧（全コンポーネント分）

| 環境変数 | デフォルト | 用途 | 機密 |
|---|---|---|---|
| `DB_PATH` | `/data/portfolio.db` | SQLiteファイルパス | No |
| `CSV_ALLOWED_DIR` | `/data` | CSVパス制限ディレクトリ | No |
| `JQUANTS_REFRESH_TOKEN` | — | J-Quants認証トークン | **Yes** |
| `GOOGLE_SA_KEY_PATH` | — | サービスアカウントJSONキーパス | **Yes** |
| `GOOGLE_DRIVE_FOLDER_ID` | — | アーカイブ先DriveフォルダID | No |
| `LOG_LEVEL` | `INFO` | ログレベル制御 | No |
