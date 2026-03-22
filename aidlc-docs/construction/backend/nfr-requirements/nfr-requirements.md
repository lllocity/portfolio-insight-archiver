# NFR Requirements — backend

---

## パフォーマンス要件

| ID | 要件 | 基準値 |
|---|---|---|
| NFR-PERF-01 | CSVインポート〜レスポンス（外部API込み）| 10秒以内 |
| NFR-PERF-02 | J-Quants APIタイムアウト | 5秒（タイムアウト時はメタなしで継続） |
| NFR-PERF-03 | J-Quantsメタデータキャッシュ有効期間 | 24時間 |
| NFR-PERF-04 | Google Docs APIタイムアウト | 10秒（タイムアウト時はアーカイブスキップ） |
| NFR-PERF-05 | ポートフォリオ参照レスポンス（キャッシュ利用時）| 2秒以内 |

---

## セキュリティ要件（Security Baseline）

### 適用ルール

| Rule | 適用 | 実装方針 |
|---|---|---|
| SECURITY-01 | **一部適用** | SQLiteはローカルファイル（N/A）。J-Quants・Google Docs API通信はHTTPS必須 |
| SECURITY-02 | **N/A** | ロードバランサー・APIゲートウェイなし（ローカルDocker）|
| SECURITY-03 | **適用** | SLF4J + Logback。構造化ログ（timestamp・level・message）。トークン・APIキーのログ出力禁止 |
| SECURITY-04 | **適用** | Spring Security フィルターで全レスポンスにHTTPセキュリティヘッダーを付与 |
| SECURITY-05 | **適用** | Bean Validation（Hibernate Validator）+ CSVパスは `/data/` 配下に制限 |
| SECURITY-06 | **N/A** | クラウドIAMポリシーなし |
| SECURITY-07 | **N/A** | クラウドネットワーク設定なし（ローカルDocker）|
| SECURITY-08 | **適用** | CORS: `localhost:5173` のみ許可。ユーザー認証なし（個人ツール）|
| SECURITY-09 | **適用** | 本番エラーレスポンスはスタックトレース非公開。Spring Boot Actuator最小公開 |
| SECURITY-10 | **適用** | Gradle dependency lockingでバージョン固定。脆弱性スキャンは手動実施（`./gradlew dependencyCheckAnalyze`） |
| SECURITY-11 | **一部適用** | セキュリティロジックは専用モジュールに分離。Rate limiting: ローカルonly・外部公開なし → N/A |
| SECURITY-12 | **適用** | J-QuantsトークンはSQLiteに保存・ログ出力禁止。サービスアカウントキーは環境変数でパス指定 |
| SECURITY-13 | **一部適用** | JacksonによるJSONの安全なデシリアライゼーション。CDN/外部スクリプトなし → SRI N/A |
| SECURITY-14 | **N/A** | 個人ツール・ローカル環境。本番監視ダッシュボード・アラートは不要 |
| SECURITY-15 | **適用** | `@ControllerAdvice` グローバルエラーハンドラー。全外部呼び出しに明示的 try-catch。フェイルクローズ |

### セキュリティヘッダー要件（SECURITY-04）

| ヘッダー | 値 |
|---|---|
| `Content-Security-Policy` | `default-src 'self'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

### 入力バリデーション要件（SECURITY-05）

| 入力 | バリデーション |
|---|---|
| CSVファイルパス | 必須・文字列長255以下・絶対パス・`/data/` 配下であること・ファイル存在確認・拡張子 `.csv` |
| Google Drive フォルダID | 必須（設定時）・英数字+ハイフンのみ・44文字以内 |
| J-Quants リフレッシュトークン | 必須（設定時）・文字列長512以下 |
| 設定キー（key） | 既定キーリストの中に含まれること |
| 設定値（value） | 文字列長1024以下 |

---

## 可用性・信頼性要件

| ID | 要件 |
|---|---|
| NFR-AVAIL-01 | J-Quants API障害時: メタデータなしでインポートを継続（警告付き） |
| NFR-AVAIL-02 | Google Docs API障害時: アーカイブをスキップしてインポートを成功扱い（警告付き） |
| NFR-AVAIL-03 | J-Quants・Google Docs APIの設定未完了時: 機能をスキップ（エラーにしない） |

---

## テスト要件

| ID | 要件 |
|---|---|
| NFR-TEST-01 | ユニットテストのみ（外部依存はすべてMockito でモック） |
| NFR-TEST-02 | テスト対象: CsvParserService・PortfolioAnalysisService・AiPromptGeneratorService・SnapshotService |
| NFR-TEST-03 | JUnit 5 + Mockito を使用 |
| NFR-TEST-04 | テストはGradle `test` タスクで実行 |

---

## 保守性要件

| ID | 要件 |
|---|---|
| NFR-MAINT-01 | Gradle Kotlin DSL（`build.gradle.kts`）を使用 |
| NFR-MAINT-02 | Flyway によるSQLiteスキーママイグレーション管理 |
| NFR-MAINT-03 | 環境変数は `application.yml` から `${ENV_VAR}` 形式で参照 |
| NFR-MAINT-04 | `.env.example` に全環境変数を記述（値は空またはサンプル） |
| NFR-MAINT-05 | Gradle dependency locking（`gradle.lockfile`）でバージョンを固定 |
