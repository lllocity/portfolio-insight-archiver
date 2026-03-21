# Component Dependency — Portfolio Insight & Archiver

## 依存関係マトリクス

| コンポーネント | 依存先 | 通信方式 |
|---|---|---|
| Vue.js Frontend | Spring Boot Backend | HTTP REST (localhost:8080) |
| CsvImportController | ImportOrchestrationService | 直接呼び出し |
| ImportOrchestrationService | CsvParserService | 直接呼び出し |
| ImportOrchestrationService | JQuantsApiClient | 直接呼び出し |
| ImportOrchestrationService | PortfolioAnalysisService | 直接呼び出し |
| ImportOrchestrationService | SnapshotService | 直接呼び出し |
| ImportOrchestrationService | AiPromptGeneratorService | 直接呼び出し |
| ImportOrchestrationService | GoogleDocsArchiveService | 直接呼び出し |
| PortfolioQueryService | SnapshotService | 直接呼び出し |
| PortfolioQueryService | PortfolioAnalysisService | 直接呼び出し |
| PortfolioQueryService | AiPromptGeneratorService | 直接呼び出し |
| SnapshotService | SnapshotRepository (SQLite) | JPA/JDBC |
| SettingsService | SettingsRepository (SQLite) | JPA/JDBC |
| JQuantsApiClient | J-Quants API | HTTPS |
| JQuantsApiClient | StockMetaCache (SQLite) | JPA/JDBC |
| GoogleDocsArchiveService | Google Docs API | HTTPS |
| CsvParserService | ローカルファイルシステム | File I/O |

---

## データフロー図

### フロー 1: CSVインポート（メインフロー）

```
ユーザー
  │ ① ファイルパスを入力 → 「CSVを取り込む」クリック
  ▼
Vue.js (PortfolioPage)
  │ ② POST /api/csv/import { filePath }
  ▼
CsvImportController
  │ ③ バリデーション
  ▼
ImportOrchestrationService
  │ ④ parse(filePath)
  ├─► CsvParserService ──► ローカルFS ──► List<HoldingRecord>
  │
  │ ⑤ fetchMetadata(tickerCodes)
  ├─► JQuantsApiClient ──► [キャッシュ確認] ──► [J-Quants API] ──► List<StockMeta>
  │
  │ ⑥ mergeWithMeta + summarize + calculateDiff
  ├─► PortfolioAnalysisService ──► SnapshotService (前回取得)
  │
  │ ⑦ saveSnapshot(today, holdings)  ※同日上書き
  ├─► SnapshotService ──► SQLite
  │
  │ ⑧ generatePrompt(context)
  ├─► AiPromptGeneratorService ──► String (promptText)
  │
  │ ⑨ archive(snapshot, analysis, prompt)  ※失敗してもOK
  └─► GoogleDocsArchiveService ──► Google Docs API
  │
  ▼
ImportResultDto { success, importedCount, docUrl?, warnings? }
  │
  ▼
Vue.js (結果表示 → PortfolioPageにリダイレクト)
```

### フロー 2: ポートフォリオ表示（参照フロー）

```
ユーザー → PortfolioPageを開く
  │
  ▼
Vue.js
  │ GET /api/portfolio/latest
  ▼
PortfolioQueryService
  ├─► SnapshotService.findLatest() ──► SQLite
  ├─► PortfolioAnalysisService.mergeWithMeta()
  └─► JQuantsApiClient.fetchMetadata() (キャッシュ優先)
  │
  ▼
PortfolioData { holdings, sectorAllocation, summary, diff }
  │
  ▼
Vue.js (テーブル・グラフ表示)
```

### フロー 3: AIプロンプト表示

```
ユーザー → PromptPageを開く
  │
  ▼
Vue.js
  │ GET /api/portfolio/prompt
  ▼
PortfolioQueryService
  ├─► SnapshotService.findLatest()
  └─► AiPromptGeneratorService.generatePrompt()
  │
  ▼
String (promptText)
  │
  ▼
Vue.js (テキストエリア表示 + コピーボタン)
  │
  ▼
ユーザーがChatGPT/Claude UIにペースト
```

---

## Docker Composeサービス構成

```
docker-compose.yml
  ├── service: backend (Spring Boot, port 8080)
  │     volumes:
  │       - ./data:/data          # CSVファイル配置場所
  │       - ./config:/config      # サービスアカウントJSONキー
  │     environment:
  │       - GOOGLE_SA_KEY_PATH=/config/sa-key.json
  │       - GOOGLE_DRIVE_FOLDER_ID=...
  │       - JQUANTS_REFRESH_TOKEN=...
  │       - DB_PATH=/data/portfolio.db
  │
  └── service: frontend (Vite dev, port 5173)
        environment:
          - VITE_API_BASE_URL=http://localhost:8080
```

---

## セキュリティ境界

```
[ブラウザ: localhost:5173]
        │
        │ CORS許可: localhost:5173のみ
        │
[Spring Boot: localhost:8080]
        │
        ├── [SQLite: /data/portfolio.db]    ローカルファイル
        ├── [J-Quants API]                   HTTPS, APIトークン認証
        └── [Google Docs API]               HTTPS, サービスアカウント認証
```
