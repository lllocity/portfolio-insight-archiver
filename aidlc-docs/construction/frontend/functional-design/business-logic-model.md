# ビジネスロジックモデル — frontend ユニット

---

## 1. アプリケーション起動フロー

```
App.vue マウント
  ├── settingsStore.load()       → GET /api/settings
  └── portfolioStore.load()      → GET /api/portfolio/latest
        ├── 成功 → PortfolioPage にデータ表示
        └── 204 No Content → 「データなし」空状態を表示
```

---

## 2. CSVインポートフロー

```
CsvImportForm
  1. settingsStore.csvDefaultPath → パス入力フィールドに事前表示
  2. ユーザーがパスを確認/変更
  3. 「インポート」ボタンクリック
     ├── バリデーション: パスが空でないか確認
     ├── ローディング状態ON・ボタン無効化
     ├── POST /api/csv/import { filePath: path }
     │     ├── 成功 (200) → ImportResult を受信
     │     │     ├── portfolioStore.load() を再実行（最新データに更新）
     │     │     ├── 成功トースト表示:
     │     │     │     「{importedCount}銘柄を取り込みました」
     │     │     │     docUrl があれば「Google Docs にアーカイブ済み」リンク表示
     │     │     └── warnings があれば警告バナーに一覧表示
     │     └── エラー → AppError.vue でエラーメッセージ表示
     └── ローディング状態OFF・ボタン有効化
```

---

## 3. PortfolioPage 表示フロー

```
PortfolioPage マウント時:
  portfolioStore のデータを利用（App.vue で取得済み）

表示コンポーネントへのデータ渡し:
  ├── SummaryCard × 3
  │     ├── 総評価額: snapshot.totalValuation → formatCurrency()
  │     ├── 総損益: snapshot.totalProfitLoss, totalProfitLossPct → formatCurrency() + formatPct() + カラー
  │     └── 保有銘柄数: snapshot.holdingCount
  ├── SectorChart
  │     └── sectors → ドーナツチャート（allocationPct をデータに使用）
  ├── HoldingsTable
  │     └── holdings → テーブル表示（デフォルトソート: totalValuation 降順）
  └── DiffView
        └── diff → 前回スナップショットとの差分表示
```

---

## 4. HistoryPage 表示フロー

```
HistoryPage マウント時:
  GET /api/snapshots → スナップショット一覧取得
  日付降順でリスト表示

ユーザー操作:
  1. スナップショット一覧から2つを選択（チェックボックス）
     ├── 3つ目を選択しようとした場合: 最初の選択を解除して新しい選択を反映
     └── 2つ選択完了
         ├── 日付の古い方 = fromDate、新しい方 = toDate
         └── GET /api/snapshots/diff?from={fromDate}&to={toDate}
               ├── 成功 → DiffView コンポーネントに結果表示
               └── エラー → AppError.vue で表示
```

---

## 5. PromptPage 表示フロー

```
PromptPage マウント時:
  GET /api/prompt/latest
    ├── 成功 → textarea に prompt.prompt を表示
    ├── 204 No Content → 「スナップショットがまだありません。CSVをインポートしてください。」
    └── エラー → AppError.vue で表示

「コピー」ボタンクリック:
  useClipboard(prompt) → クリップボードにコピー
  → ボタンテキストを「✓ コピー完了」に変更（2秒後に元に戻す）
```

---

## 6. SettingsPage 表示フロー

```
SettingsPage マウント時:
  settingsStore のデータを利用（App.vue で取得済み）
  → フォームフィールドに設定値を反映

「保存」ボタンクリック:
  ├── PUT /api/settings { csvDefaultPath, googleDriveFolderId }
  │     ├── 成功 → settingsStore を更新 + 「設定を保存しました」トースト
  │     └── エラー → AppError.vue で表示
  └── ローディング状態OFF
```

---

## 7. Pinia ストア設計

### portfolioStore

```typescript
state:
  - data: PortfolioResponse | null
  - loading: boolean
  - error: string | null

actions:
  - load(): Promise<void>   // GET /api/portfolio/latest
  - reload(): Promise<void> // インポート後の再取得（= load()）
```

### settingsStore

```typescript
state:
  - settings: Settings | null
  - loading: boolean
  - error: string | null

actions:
  - load(): Promise<void>                         // GET /api/settings
  - update(dto: Settings): Promise<void>          // PUT /api/settings
```

---

## 8. 不足バックエンドエンドポイント（コード生成時に追加）

### GET /api/snapshots

レスポンス: `SnapshotListItem[]`（日付降順）

```java
// SnapshotRepository に追加
List<Snapshot> findAllByOrderBySnapshotDateDesc();

// 新規コントローラー: SnapshotQueryController
@GetMapping("/api/snapshots")
public ResponseEntity<List<SnapshotListItem>> listSnapshots()
```

### GET /api/snapshots/diff

クエリパラメータ: `?from=2026-03-17&to=2026-03-24`
レスポンス: `SnapshotDiffDto`（既存 PortfolioResponse.SnapshotDiffDto を再利用）

```java
// PortfolioAnalysisService.calculateDiff() を再利用
@GetMapping("/api/snapshots/diff")
public ResponseEntity<SnapshotDiffDto> getSnapshotDiff(
    @RequestParam LocalDate from,
    @RequestParam LocalDate to
)
```

### GET /api/prompt/latest

レスポンス: `{ "prompt": "..." }`（204 No Content = スナップショットなし）

```java
// AiPromptGeneratorService を PortfolioQueryController から呼び出す形で追加
@GetMapping("/api/prompt/latest")
public ResponseEntity<PromptResponse> getLatestPrompt()
```

---

## 9. Vite プロキシ設定

開発環境では Vite の proxy 機能でAPIコールをバックエンドに転送:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true
    }
  }
}
```

本番（Docker Compose）環境では nginx で `/api` → `backend:8080` にプロキシ。
