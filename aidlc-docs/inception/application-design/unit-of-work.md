# Unit of Work — Portfolio Insight & Archiver

## ユニット構成

本システムは **2ユニット** で構成する。

| ユニット | 技術 | 説明 |
|---|---|---|
| **Unit 1: backend** | Spring Boot 3.x + Java 21 + Gradle | 全バックエンドロジック・外部API連携・SQLite永続化 |
| **Unit 2: frontend** | Vue.js 3 + Vite + TypeScript | ユーザーインターフェース |

---

## Unit 1: backend

### 概要
Spring Boot の単一アプリケーション（単一JARデプロイ）。内部はパッケージ（モジュール）で責務を分離する。

### 内部モジュール（パッケージ）

| パッケージ | 主要クラス | 責務 |
|---|---|---|
| `csv` | `CsvImportController`, `CsvParserService` | SBI証券CSVの受付・パース |
| `analysis` | `PortfolioAnalysisService`, `ImportOrchestrationService` | 分析・集計・差分計算・オーケストレーション |
| `jquants` | `JQuantsApiClient`, `StockMetaCacheRepository` | J-Quants API通信・キャッシュ管理 |
| `google` | `GoogleDocsArchiveService` | サービスアカウント認証・Google Docsアーカイブ |
| `prompt` | `AiPromptGeneratorService` | 構造化AIプロンプト生成 |
| `snapshot` | `SnapshotService`, `SnapshotRepository` | スナップショット永続化・取得 |
| `settings` | `SettingsService`, `SettingsController`, `SettingsRepository` | アプリ設定管理 |
| `portfolio` | `PortfolioQueryController` | ポートフォリオデータ提供API |

### ディレクトリ構造

```
backend/
├── build.gradle.kts
├── settings.gradle.kts
├── Dockerfile
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/portfolio/
    │   │       ├── PortfolioApplication.java
    │   │       ├── csv/
    │   │       │   ├── CsvImportController.java
    │   │       │   ├── CsvParserService.java
    │   │       │   └── dto/
    │   │       │       ├── CsvImportRequest.java
    │   │       │       └── ImportResultDto.java
    │   │       ├── analysis/
    │   │       │   ├── ImportOrchestrationService.java
    │   │       │   ├── PortfolioAnalysisService.java
    │   │       │   └── dto/
    │   │       ├── jquants/
    │   │       │   ├── JQuantsApiClient.java
    │   │       │   └── StockMetaCacheRepository.java
    │   │       ├── google/
    │   │       │   └── GoogleDocsArchiveService.java
    │   │       ├── prompt/
    │   │       │   └── AiPromptGeneratorService.java
    │   │       ├── snapshot/
    │   │       │   ├── SnapshotService.java
    │   │       │   ├── SnapshotRepository.java
    │   │       │   └── model/
    │   │       │       ├── Snapshot.java
    │   │       │       └── HoldingRecord.java
    │   │       ├── settings/
    │   │       │   ├── SettingsController.java
    │   │       │   ├── SettingsService.java
    │   │       │   └── SettingsRepository.java
    │   │       └── portfolio/
    │   │           └── PortfolioQueryController.java
    │   └── resources/
    │       ├── application.yml
    │       └── db/
    │           └── migration/         # Flyway マイグレーション
    └── test/
        └── java/
            └── com/portfolio/
                ├── csv/
                ├── analysis/
                ├── jquants/
                └── snapshot/
```

### 主要依存ライブラリ（build.gradle.kts）

| ライブラリ | 用途 |
|---|---|
| `spring-boot-starter-web` | REST API |
| `spring-boot-starter-data-jpa` | SQLite ORM |
| `sqlite-jdbc` | SQLiteドライバ |
| `flyway-core` | DBマイグレーション |
| `opencsv` または `commons-csv` | CSVパース |
| `google-api-services-docs` | Google Docs API |
| `google-auth-library-oauth2-http` | サービスアカウント認証 |
| `jackson-databind` | JSON処理 |

---

## Unit 2: frontend

### 概要
Vue.js 3 + Vite の SPA。Spring Boot バックエンド（:8080）をAPIとして呼び出す。

### 内部モジュール（ディレクトリ）

| ディレクトリ | 責務 |
|---|---|
| `pages/` | 4ページ（Portfolio / History / Prompt / Settings） |
| `components/` | 再利用可能UIコンポーネント（テーブル・グラフ・カード等） |
| `api/` | バックエンドAPIクライアント（axios） |
| `stores/` | グローバル状態管理（Pinia） |
| `composables/` | 共通ロジック（クリップボード・フォーマット等） |

### ディレクトリ構造

```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── Dockerfile
└── src/
    ├── main.ts
    ├── App.vue
    ├── router/
    │   └── index.ts
    ├── pages/
    │   ├── PortfolioPage.vue
    │   ├── HistoryPage.vue
    │   ├── PromptPage.vue
    │   └── SettingsPage.vue
    ├── components/
    │   ├── HoldingsTable.vue
    │   ├── SectorChart.vue
    │   ├── SummaryCard.vue
    │   ├── DiffView.vue
    │   └── CsvImportForm.vue
    ├── api/
    │   ├── csvApi.ts
    │   ├── portfolioApi.ts
    │   ├── historyApi.ts
    │   └── settingsApi.ts
    ├── stores/
    │   ├── portfolioStore.ts
    │   └── settingsStore.ts
    └── composables/
        ├── useClipboard.ts
        └── useFormatters.ts
```

### 主要依存ライブラリ

| ライブラリ | 用途 |
|---|---|
| `vue` 3 | UIフレームワーク |
| `vue-router` | ルーティング |
| `pinia` | 状態管理 |
| `axios` | HTTPクライアント |
| `chart.js` + `vue-chartjs` | セクターグラフ |

---

## モノレポ全体構造

```
portfolio-insight-archiver/         # リポジトリルート
├── backend/                        # Unit 1: Spring Boot
├── frontend/                       # Unit 2: Vue.js
├── docker-compose.yml              # 全サービス定義
├── docker-compose.override.yml     # 開発用オーバーライド（任意）
├── .env.example                    # 環境変数テンプレート
├── data/                           # CSVファイル配置場所（Dockerマウント）
│   └── .gitkeep
├── config/                         # サービスアカウントJSONキー（Dockerマウント）
│   └── .gitkeep
└── aidlc-docs/                     # AIドキュメント

```

**注意**: `data/` と `config/` は `.gitignore` に追加し、実ファイルをコミットしない。

---

## 構築順序（Construction Phase）

| 順序 | ユニット | 理由 |
|---|---|---|
| 1st | **backend** | frontendが依存するAPIを先に実装 |
| 2nd | **frontend** | バックエンドAPIに合わせてUI実装 |

---

## PBR/PER に関する注記

J-Quants 無料プランでPBR/PERが取得できない場合、以下の箇所を仕様から除外する:
- `JQuantsApiClient` の `pbr`・`per` フィールド取得
- `PortfolioAnalysisService` での指標マージ
- `AiPromptGeneratorService` のプロンプト内指標セクション
- フロントエンドの銘柄テーブルのPBR/PER列

Construction フェーズで J-Quants API仕様を確認次第、該当箇所を調整する。
