# Backend Code Generation Plan

## Unit Context

- **Unit**: backend
- **Location**: `backend/` (モノレポ構成)
- **Package**: `com.portfolio`
- **Tech**: Spring Boot 3.x + Java 21 + Gradle Kotlin DSL
- **Dependencies**: frontend unit が backend API に依存（frontend は後で実装）

## 実装する機能要件

FR-CSV-01/02/03/04, FR-JQUANTS-01/02/03/04, FR-ANALYSIS-01〜05,
FR-AI-01/02/03/04, FR-GDOCS-01〜06, FR-AUTH-01/02/03/04

---

## Step 1: プロジェクト構造セットアップ [ ]

Gradle プロジェクトの骨格ファイルを作成する。

- [ ] `backend/settings.gradle.kts`
- [ ] `backend/build.gradle.kts`（依存ライブラリ全定義・dependency locking・OWASP plugin）
- [ ] `backend/gradle/wrapper/gradle-wrapper.properties`
- [ ] `backend/gradlew` + `backend/gradlew.bat`（gradlew は実行権限付き）
- [ ] `backend/src/main/java/com/portfolio/PortfolioApplication.java`

---

## Step 2: DBマイグレーションスクリプト [ ]

Flyway SQLスクリプトを作成する。

- [ ] `backend/src/main/resources/db/migration/V1__create_snapshots.sql`
- [ ] `backend/src/main/resources/db/migration/V2__create_holdings.sql`
- [ ] `backend/src/main/resources/db/migration/V3__create_stock_meta_cache.sql`
- [ ] `backend/src/main/resources/db/migration/V4__create_settings.sql`

---

## Step 3: アプリケーション設定 [ ]

- [ ] `backend/src/main/resources/application.yml`（DB・Flyway・Spring Security・Actuator・外部API設定）
- [ ] `backend/src/main/resources/logback-spring.xml`（構造化ログ・LOG_LEVEL環境変数対応）

---

## Step 4: セキュリティ・共通基盤 [ ]

- [ ] `backend/src/main/java/com/portfolio/common/security/SecurityConfig.java`（CORS・HTTPヘッダー・CSRF無効化）
- [ ] `backend/src/main/java/com/portfolio/common/exception/ApiErrorResponse.java`
- [ ] `backend/src/main/java/com/portfolio/common/exception/GlobalExceptionHandler.java`（@ControllerAdvice）
- [ ] `backend/src/main/java/com/portfolio/common/exception/CsvParseException.java`
- [ ] `backend/src/main/java/com/portfolio/common/exception/CsvNotFoundException.java`
- [ ] `backend/src/main/java/com/portfolio/common/exception/PathSecurityException.java`

---

## Step 5: ドメインモデル・リポジトリ [ ]

エンティティとJPAリポジトリを作成する。

- [ ] `backend/src/main/java/com/portfolio/snapshot/model/Snapshot.java`（@Entity）
- [ ] `backend/src/main/java/com/portfolio/snapshot/model/Holding.java`（@Entity）
- [ ] `backend/src/main/java/com/portfolio/jquants/model/StockMeta.java`（@Entity - キャッシュテーブル）
- [ ] `backend/src/main/java/com/portfolio/settings/model/Setting.java`（@Entity）
- [ ] `backend/src/main/java/com/portfolio/snapshot/SnapshotRepository.java`（JpaRepository）
- [ ] `backend/src/main/java/com/portfolio/jquants/StockMetaCacheRepository.java`（JpaRepository）
- [ ] `backend/src/main/java/com/portfolio/settings/SettingsRepository.java`（JpaRepository）

---

## Step 6: 値オブジェクト（VO） [ ]

永続化しないデータ転送オブジェクトを作成する。

- [ ] `backend/src/main/java/com/portfolio/analysis/dto/PortfolioSummary.java`
- [ ] `backend/src/main/java/com/portfolio/analysis/dto/SectorAllocation.java`
- [ ] `backend/src/main/java/com/portfolio/analysis/dto/SnapshotDiff.java`
- [ ] `backend/src/main/java/com/portfolio/analysis/dto/HoldingChange.java`
- [ ] `backend/src/main/java/com/portfolio/analysis/dto/EnrichedHolding.java`
- [ ] `backend/src/main/java/com/portfolio/analysis/dto/PortfolioAnalysisResult.java`

---

## Step 7: CSVモジュール [ ]

FR-CSV-01〜04 を実装する。

- [ ] `backend/src/main/java/com/portfolio/csv/CsvPathValidator.java`（パストラバーサル防止）
- [ ] `backend/src/main/java/com/portfolio/csv/dto/HoldingRecord.java`（CSVパース中間モデル）
- [ ] `backend/src/main/java/com/portfolio/csv/CsvParserService.java`（Shift-JIS読込・集約ロジック）
- [ ] `backend/src/main/java/com/portfolio/csv/dto/CsvImportRequest.java`
- [ ] `backend/src/main/java/com/portfolio/csv/dto/ImportResultDto.java`
- [ ] `backend/src/main/java/com/portfolio/csv/CsvImportController.java`（POST /api/csv/import）

---

## Step 8: 分析・オーケストレーションモジュール [ ]

FR-ANALYSIS-01〜05 を実装する。

- [ ] `backend/src/main/java/com/portfolio/analysis/PortfolioAnalysisService.java`（セクター集計・差分・マージ）
- [ ] `backend/src/main/java/com/portfolio/analysis/ImportOrchestrationService.java`（インポート全体フロー調整）

---

## Step 9: J-Quantsモジュール [ ]

FR-JQUANTS-01〜04 を実装する。

- [ ] `backend/src/main/java/com/portfolio/jquants/JQuantsIdTokenCache.java`（インメモリトークンキャッシュ）
- [ ] `backend/src/main/java/com/portfolio/jquants/JQuantsApiClient.java`（API通信・24hキャッシュ・Fallback）

---

## Step 10: Google Docsモジュール [ ]

FR-GDOCS-01〜06, FR-AUTH-01〜04 を実装する。

- [ ] `backend/src/main/java/com/portfolio/google/GoogleDocsArchiveService.java`（サービスアカウント認証・Doc作成・リッチフォーマット書込）

---

## Step 11: AIプロンプトモジュール [ ]

FR-AI-01〜04 を実装する。

- [ ] `backend/src/main/java/com/portfolio/prompt/AiPromptGeneratorService.java`（構造化プロンプト生成）

---

## Step 12: スナップショットモジュール [ ]

- [ ] `backend/src/main/java/com/portfolio/snapshot/SnapshotService.java`（保存・取得・同日上書き）

---

## Step 13: ポートフォリオ参照モジュール [ ]

- [ ] `backend/src/main/java/com/portfolio/portfolio/dto/PortfolioResponse.java`
- [ ] `backend/src/main/java/com/portfolio/portfolio/PortfolioQueryController.java`（GET /api/portfolio/*）

---

## Step 14: 設定モジュール [ ]

- [ ] `backend/src/main/java/com/portfolio/settings/dto/SettingsDto.java`
- [ ] `backend/src/main/java/com/portfolio/settings/SettingsService.java`
- [ ] `backend/src/main/java/com/portfolio/settings/SettingsController.java`（GET/PUT /api/settings）

---

## Step 15: ユニットテスト [ ]

JUnit 5 + Mockito で主要サービスのテストを作成する。

- [ ] `backend/src/test/java/com/portfolio/csv/CsvPathValidatorTest.java`
- [ ] `backend/src/test/java/com/portfolio/csv/CsvParserServiceTest.java`（集約ロジック・Shift-JIS）
- [ ] `backend/src/test/java/com/portfolio/analysis/PortfolioAnalysisServiceTest.java`（差分・セクター計算）
- [ ] `backend/src/test/java/com/portfolio/prompt/AiPromptGeneratorServiceTest.java`
- [ ] `backend/src/test/java/com/portfolio/snapshot/SnapshotServiceTest.java`

---

## Step 16: デプロイメントアーティファクト [ ]

- [ ] `backend/Dockerfile`（マルチステージ・eclipse-temurin:21）
- [ ] `docker-compose.yml`（ルート）
- [ ] `.env.example`（ルート）
- [ ] `.gitignore`（ルート）
- [ ] `data/.gitkeep`
- [ ] `config/.gitkeep`
- [ ] `README.md`（ルート・セットアップ手順）

---

## ステップ数: 16ステップ / 約60ファイル

| カテゴリ | ステップ | ファイル数 |
|---|---|---|
| プロジェクト構造 | Step 1 | 5 |
| DBマイグレーション | Step 2 | 4 |
| 設定 | Step 3 | 2 |
| セキュリティ・共通 | Step 4 | 6 |
| ドメイン・リポジトリ | Step 5 | 7 |
| 値オブジェクト | Step 6 | 6 |
| CSVモジュール | Step 7 | 6 |
| 分析・オーケストレーション | Step 8 | 2 |
| J-Quantsモジュール | Step 9 | 2 |
| Google Docsモジュール | Step 10 | 1 |
| AIプロンプトモジュール | Step 11 | 1 |
| スナップショットモジュール | Step 12 | 1 |
| ポートフォリオ参照 | Step 13 | 2 |
| 設定モジュール | Step 14 | 3 |
| ユニットテスト | Step 15 | 5 |
| デプロイメント | Step 16 | 7 |
