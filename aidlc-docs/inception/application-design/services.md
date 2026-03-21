# Services — Portfolio Insight & Archiver

## サービスレイヤー概要

Spring Boot バックエンドのサービスオーケストレーションを定義する。
各サービスは単一責務を持ち、コントローラーからのオーケストレーションで連携する。

---

## Service 1: ImportOrchestrationService

**目的**: CSVインポートのエンドツーエンドフローを調整するオーケストレーター

**オーケストレーションフロー**:

```
1. CsvParserService.parse(filePath)
      → List<HoldingRecord>

2. JQuantsApiClient.fetchMetadata(tickerCodes)
      → List<StockMeta>

3. PortfolioAnalysisService.mergeWithMeta(holdings, meta)
      → List<EnrichedHolding>

4. PortfolioAnalysisService.summarize(holdings)
      → PortfolioSummary

5. SnapshotService.findPrevious(today)
      → Optional<Snapshot>

6. PortfolioAnalysisService.calculateDiff(current, previous)
      → SnapshotDiff

7. SnapshotService.saveSnapshot(today, holdings)
      → Snapshot

8. AiPromptGeneratorService.generatePrompt(context)
      → String (promptText)

9. GoogleDocsArchiveService.archive(snapshot, analysis, promptText)
      → String (docUrl)  ※ 失敗してもインポート自体は成功扱い
```

**エラーハンドリング方針**:
- Step 1-2 で失敗 → インポート全体を失敗として返す
- Step 9（Google Docs）で失敗 → インポートは成功扱い、警告をレスポンスに含める
- J-Quants APIで失敗 → メタデータなしで継続（グレースフルデグラデーション）

---

## Service 2: CsvImportController（REST エンドポイント）

**目的**: HTTPリクエストの受付・バリデーション・レスポンス整形

**エンドポイント一覧**:

| Method | Path | 説明 |
|---|---|---|
| POST | `/api/csv/import` | CSVインポート実行 |

---

## Service 3: PortfolioQueryService

**目的**: フロントエンドへのポートフォリオデータ提供

**エンドポイント一覧**:

| Method | Path | 説明 |
|---|---|---|
| GET | `/api/portfolio/latest` | 最新スナップショットの分析結果 |
| GET | `/api/portfolio/prompt` | AI分析プロンプトテキスト |
| GET | `/api/portfolio/snapshots` | スナップショット一覧 |
| GET | `/api/portfolio/diff` | 2スナップショット間の差分 |

---

## Service 4: SettingsService

**目的**: アプリ設定の管理

**エンドポイント一覧**:

| Method | Path | 説明 |
|---|---|---|
| GET | `/api/settings` | 全設定を取得 |
| PUT | `/api/settings` | 設定を保存 |

---

## サービス間通信パターン

```
[Vue.js Frontend]
      │ HTTP (REST JSON)
      │ port 8080
      ▼
[Spring Boot Backend]
  ├─ ImportOrchestrationService
  │    ├─► CsvParserService (ローカルファイル I/O)
  │    ├─► JQuantsApiClient ──────────► [J-Quants API] (HTTPS)
  │    ├─► PortfolioAnalysisService
  │    ├─► SnapshotService ───────────► [SQLite]
  │    ├─► AiPromptGeneratorService
  │    └─► GoogleDocsArchiveService ──► [Google Docs API] (HTTPS)
  │
  ├─ PortfolioQueryService
  │    └─► SnapshotService ───────────► [SQLite]
  │
  └─ SettingsService
       └─► SettingsRepository ────────► [SQLite]
```

---

## 外部サービス依存

| 外部サービス | 用途 | 認証方式 | 障害時の挙動 |
|---|---|---|---|
| J-Quants API | 銘柄メタデータ取得 | リフレッシュトークン | メタデータなしで継続（警告表示） |
| Google Docs API | スナップショットアーカイブ | サービスアカウントJSONキー | アーカイブスキップ（警告表示） |
