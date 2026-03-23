# フロントエンドコンポーネント設計 — frontend ユニット

技術スタック: Vue.js 3 (Composition API) + TypeScript + Tailwind CSS + Pinia + Chart.js

---

## コンポーネント階層

```
App.vue
├── ナビゲーションタブ（Portfolio / 履歴 / AIプロンプト / 設定）
├── AppError.vue（グローバルエラーバナー）
└── <router-view>
    ├── PortfolioPage.vue
    │   ├── CsvImportForm.vue
    │   ├── SummaryCard.vue × 3
    │   ├── SectorChart.vue
    │   ├── HoldingsTable.vue
    │   └── DiffView.vue
    ├── HistoryPage.vue
    │   ├── [スナップショット一覧テーブル（インライン）]
    │   └── DiffView.vue
    ├── PromptPage.vue
    │   └── [textarea + コピーボタン（インライン）]
    └── SettingsPage.vue
        └── [設定フォーム（インライン）]
```

---

## App.vue

**責務**: タブナビゲーション・グローバルエラー表示・初期データ取得

```
props: なし

state（Pinia経由）:
  - portfolioStore
  - settingsStore

onMounted:
  - settingsStore.load()
  - portfolioStore.load()

template:
  - ナビゲーションバー（タブ4つ: Portfolio / 履歴 / AIプロンプト / 設定）
  - AppError.vue（エラー時のみ表示）
  - <RouterView>
```

---

## AppError.vue

**責務**: APIエラーの全画面バナー表示

```
props:
  - message: string

emits:
  - close: void

template:
  - 赤い警告バナー（画面上部固定）
  - エラーメッセージテキスト
  - × 閉じるボタン
```

---

## PortfolioPage.vue

**責務**: 最新スナップショット表示・CSVインポート操作

```
state（Pinia経由）:
  - portfolioStore.data: PortfolioResponse | null
  - portfolioStore.loading: boolean

template:
  ┌─ データなし（data == null）
  │   → 「まだデータがありません。CSVをインポートしてください。」
  └─ データあり
      ├── CsvImportForm
      ├── SummaryCard × 3（総評価額・総損益・銘柄数）
      ├── SectorChart（sectors データ）
      ├── HoldingsTable（holdings データ）
      └── DiffView（diff データ）
```

---

## CsvImportForm.vue

**責務**: CSVファイルパス入力・インポートトリガー

```
props: なし

state（ローカル）:
  - filePath: string  ← 初期値: settingsStore.settings?.csvDefaultPath ?? ''
  - loading: boolean
  - importResult: ImportResult | null
  - error: string | null

emits:
  - imported: void  ← 成功後に親（PortfolioPage）がストアを再取得

template:
  - テキスト入力（filePath バインド）
  - 「インポート」ボタン（loading中は無効化）
  - 成功メッセージ: 「{importedCount}銘柄を取り込みました」
  - docUrl があれば Google Docs リンク表示
  - warnings がある場合は警告リスト表示

バリデーション:
  - filePath が空の場合: ボタン無効化、「ファイルパスを入力してください」
```

---

## SummaryCard.vue

**責務**: 単一の集計値を大きく表示するカード

```
props:
  - label: string          // "総評価額"
  - value: string          // フォーマット済み文字列（呼び出し元でフォーマット）
  - subValue?: string      // "（損益率: +6.38%）" 等の補足
  - colorClass?: string    // "text-green-600" / "text-red-600"

template:
  - カードコンテナ（Tailwind: rounded, shadow, p-4）
  - label（小テキスト・グレー）
  - value（大テキスト・太字）
  - subValue（小テキスト）
```

---

## SectorChart.vue

**責務**: セクター別構成比のドーナツチャート

```
props:
  - sectors: SectorAllocation[]

Chart.js 設定:
  - type: 'doughnut'
  - data.labels: sector33Name の配列
  - data.datasets[0].data: allocationPct の配列
  - options.plugins.legend.position: 'right'
  - options.plugins.tooltip: allocationPct と totalValuation を表示
  - 「投資信託」: #94a3b8、「不明」: #cbd5e1、それ以外: Chart.js デフォルトパレット

template:
  - <canvas> タグ（vue-chartjs の Doughnut コンポーネントでラップ）
  - チャート下部に凡例テーブル（セクター名・構成比・銘柄数）
```

---

## HoldingsTable.vue

**責務**: 保有銘柄一覧テーブル

```
props:
  - holdings: EnrichedHolding[]

state（ローカル）:
  - sortKey: keyof EnrichedHolding  // デフォルト: 'totalValuation'
  - sortDir: 'asc' | 'desc'         // デフォルト: 'desc'

computed:
  - sortedHoldings: EnrichedHolding[]  // sortKey / sortDir に基づきソート

template:
  テーブルカラム:
  | 銘柄コード | 企業名 | セクター | 数量 | 評価額 | 損益 | 損益率 | 配当利回り | PBR | PER |

  表示ルール:
  - 評価額: formatCurrency()
  - 損益・損益率: formatPct() + カラークラス（BR-FE-01）
  - dividendYield / pbr / per が null → 「―」表示
  - カラムヘッダークリックでソート（評価額・損益・損益率対象）
  - 投資信託行: セクター列に「投資信託」バッジ表示

アクセシビリティ:
  - <table> / <thead> / <tbody> / <th scope="col"> を使用
  - ソートボタンに aria-sort 属性
```

---

## DiffView.vue

**責務**: 2スナップショット間の差分表示

```
props:
  - diff: SnapshotDiff

computed:
  - isEmpty: diff.addedTickers.length == 0 &&
             diff.removedTickers.length == 0 &&
             diff.changed.length == 0 &&
             diff.valuationChange == "0"

template:
  isEmpty の場合:
    → 「前回と変化なし」テキスト

それ以外:
    ├── 評価額変化サマリー: formatCurrency(valuationChange) + カラー
    ├── 追加銘柄リスト（addedTickers）: 緑バッジ「+」
    ├── 除去銘柄リスト（removedTickers）: 赤バッジ「-」
    └── 変化銘柄テーブル（changed）: 銘柄コード・数量変化・評価額変化（カラー付き）
```

---

## HistoryPage.vue

**責務**: スナップショット履歴一覧と2スナップショット間の差分比較

```
state（ローカル）:
  - snapshots: SnapshotListItem[]
  - selectedDates: string[]  // 最大2つ
  - diff: SnapshotDiff | null
  - loading: boolean
  - diffLoading: boolean

onMounted:
  - GET /api/snapshots → snapshots にセット

watch(selectedDates):
  selectedDates.length == 2 の場合:
    - fromDate = min(selectedDates)
    - toDate = max(selectedDates)
    - GET /api/snapshots/diff?from={fromDate}&to={toDate}
    → diff にセット

template:
  ┌─ スナップショット一覧テーブル
  │   カラム: 選択(チェックボックス) | 日付 | 総評価額 | 損益 | 銘柄数
  │   ├── 3つ目の選択は最初の選択を自動解除
  │   └── 選択行をハイライト（Tailwind: bg-blue-50）
  └─ 差分エリア
      ├── selectedDates.length < 2 → 「2つのスナップショットを選択してください」
      ├── diffLoading → スピナー
      └── diff あり → DiffView コンポーネント
```

---

## PromptPage.vue

**責務**: AIプロンプトの表示とコピー操作

```
state（ローカル）:
  - prompt: string
  - loading: boolean
  - copied: boolean  // コピー完了フラグ

onMounted:
  - GET /api/prompt/latest → prompt にセット
  - 204 の場合: 「スナップショットがまだありません」メッセージ表示

template:
  - <textarea readonly> にプロンプトテキスト表示（高さ: 画面の70%）
  - 「コピー」ボタン
    ├── copied == false: 「コピー」
    └── copied == true: 「✓ コピー完了」（2秒後に false に戻す）
  - 「再生成」ボタン（onMounted と同じ処理を再実行）
```

---

## SettingsPage.vue

**責務**: アプリ設定の表示・編集・保存

```
state（ローカル）:
  - form: Settings（settingsStore からコピー）
  - loading: boolean
  - saved: boolean  // 保存完了フラグ

onMounted:
  - settingsStore.settings → form にコピー

template:
  フォームフィールド:
  - CSV デフォルトパス（テキスト入力）
    例: /data/New_file.csv
  - Google Drive フォルダID（テキスト入力）
    例: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
  - 「保存」ボタン（loading中は無効化）
  - 保存成功: 「設定を保存しました ✓」（3秒後に消える）
```

---

## コンポーザブル

### useClipboard.ts

```typescript
export function useClipboard() {
  async function copy(text: string): Promise<void> {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      // フォールバック: document.execCommand('copy')
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  }
  return { copy };
}
```

### useFormatters.ts

```typescript
export function useFormatters() {
  const jpy = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });

  function formatCurrency(value: string): string  // "5000000" → "¥5,000,000"
  function formatPct(value: string): string       // "6.38" → "+6.38%" / "-1.20" → "-1.20%"
  function colorClass(value: string): string      // → "text-green-600" / "text-red-600" / ""
  function nullish(value: string | null): string  // null → "―"

  return { formatCurrency, formatPct, colorClass, nullish };
}
```

---

## Vue Router 設定

```typescript
const routes = [
  { path: '/',          redirect: '/portfolio' },
  { path: '/portfolio', component: PortfolioPage },
  { path: '/history',   component: HistoryPage },
  { path: '/prompt',    component: PromptPage },
  { path: '/settings',  component: SettingsPage },
]
```

---

## API統合ポイント一覧

| コンポーネント | 使用API | タイミング |
|---|---|---|
| App.vue | portfolioStore.load() + settingsStore.load() | onMounted |
| CsvImportForm.vue | POST /api/csv/import | ボタンクリック |
| HistoryPage.vue | GET /api/snapshots | onMounted |
| HistoryPage.vue | GET /api/snapshots/diff | 2スナップショット選択時 |
| PromptPage.vue | GET /api/prompt/latest | onMounted + 再生成ボタン |
| SettingsPage.vue | PUT /api/settings | 保存ボタン |
