# Application Design — Portfolio Insight & Archiver

## 設計決定サマリー

| 決定事項 | 内容 |
|---|---|
| フロントエンド | Vue.js 3 + Vite + TypeScript（ポート5173） |
| バックエンド | Spring Boot 3.x + Java 21（ポート8080） |
| デプロイ構成 | 分離構成（別々のDockerサービス） |
| CSVインポートUI | ファイルパスを入力するテキストフィールド + 取り込みボタン |
| Google認証 | サービスアカウントJSONキーファイル（OAuthなし） |
| ナビゲーション | マルチページ（4タブ: ポートフォリオ / 履歴 / プロンプト / 設定） |
| AIプロンプト | 構造化プロンプト（4セクション） |

---

## システム全体構成

```
[ブラウザ]
    │
    │ localhost:5173
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Vue.js 3 + Vite (TypeScript)                                │
│                                                             │
│  [PortfolioPage] [HistoryPage] [PromptPage] [SettingsPage]  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST (localhost:8080)
                           │ CORS: localhost:5173のみ許可
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Spring Boot 3.x (Java 21)                                   │
│                                                             │
│  Controllers:                                               │
│  ├── CsvImportController        POST /api/csv/import        │
│  ├── PortfolioQueryController   GET  /api/portfolio/*       │
│  └── SettingsController         GET/PUT /api/settings       │
│                                                             │
│  Services:                                                  │
│  ├── ImportOrchestrationService (オーケストレーター)          │
│  ├── CsvParserService           SBI証券CSVパース             │
│  ├── PortfolioAnalysisService   分析・集計・差分              │
│  ├── JQuantsApiClient           J-Quants API + キャッシュ    │
│  ├── AiPromptGeneratorService   構造化プロンプト生成          │
│  ├── SnapshotService            スナップショット管理           │
│  └── GoogleDocsArchiveService   Google Docsアーカイブ        │
│                                                             │
│  Repositories:                                              │
│  ├── SnapshotRepository ─────────────► SQLite               │
│  ├── StockMetaCache ─────────────────► SQLite               │
│  └── SettingsRepository ─────────────► SQLite               │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
           │ ローカルFS                        │ HTTPS
    ┌──────┴──────┐                  ┌────────┴────────────┐
    │ /data/      │                  │  J-Quants API       │
    │  *.csv      │                  │  Google Docs API    │
    │  *.db       │                  └─────────────────────┘
    │ /config/    │
    │  sa-key.json│
    └─────────────┘
```

---

## コンポーネント一覧

### フロントエンド（Vue.js）

| ID | コンポーネント | 役割 |
|---|---|---|
| FE-01 | App Shell | レイアウト・ルーティング・グローバル状態 |
| FE-02 | PortfolioPage | 最新スナップショット表示・CSVインポートUI |
| FE-03 | HistoryPage | スナップショット履歴・差分比較 |
| FE-04 | PromptPage | AIプロンプト表示・コピー |
| FE-05 | SettingsPage | アプリ設定管理 |

### バックエンド（Spring Boot）

| ID | コンポーネント | 役割 |
|---|---|---|
| BE-01 | CsvImportController | CSVインポートAPIエンドポイント |
| BE-02 | CsvParserService | SBI証券CSVパース |
| BE-03 | PortfolioAnalysisService | 分析・集計・差分計算 |
| BE-04 | JQuantsApiClient | J-Quants API通信・キャッシュ |
| BE-05 | AiPromptGeneratorService | 構造化プロンプト生成 |
| BE-06 | SnapshotService | スナップショット永続化・取得 |
| BE-07 | GoogleDocsArchiveService | Google Docsアーカイブ |
| BE-08 | SettingsRepository | 設定のCRUD |

---

## 主要データフロー

### CSVインポートフロー（全体）

```
ユーザー（ファイルパス入力）
  → POST /api/csv/import
  → CsvParserService（SBI CSV → HoldingRecord）
  → JQuantsApiClient（銘柄コード → StockMeta）
  → PortfolioAnalysisService（分析・差分計算）
  → SnapshotService（SQLite保存・同日上書き）
  → AiPromptGeneratorService（構造化プロンプト生成）
  → GoogleDocsArchiveService（Google Docs保存・同日上書き）
  → レスポンス返却（Google Docs URLを含む）
```

### AIプロンプト構造

```
【ポートフォリオ概要】
  総評価額・総損益・保有銘柄数・セクター数

【指標データ一覧】
  銘柄コード | 企業名 | セクター | PBR | PER | 配当利回り | 評価額 | 損益率

【投資方針】
  バリュー株・高配当銘柄・国策テーマ（造船・銀行・保険）重視

【分析依頼】
  - 現在のポートフォリオの評価
  - 買い増しを検討すべき銘柄の提案
  - 整理を検討すべき銘柄の提案
  - セクター偏りへの指摘
```

---

## セキュリティ設計概要

| 観点 | 対策 |
|---|---|
| CORS | `localhost:5173` のみ許可 |
| API入力バリデーション | ファイルパス・設定値すべてバリデーション |
| サービスアカウントキー | 環境変数でパス管理、ソースコードへのハードコード禁止 |
| J-Quants APIトークン | 環境変数管理、ログ出力禁止 |
| エラーレスポンス | スタックトレース非公開（汎用メッセージのみ） |
| HTTPSヘッダー | CSP・HSTS・X-Content-Type-Options 等を設定 |

---

## 詳細設計ドキュメント

- [components.md](components.md) — 全コンポーネント定義と責務
- [component-methods.md](component-methods.md) — メソッドシグネチャ（高レベル）
- [services.md](services.md) — サービス定義とオーケストレーションフロー
- [component-dependency.md](component-dependency.md) — 依存関係マトリクスとデータフロー図
