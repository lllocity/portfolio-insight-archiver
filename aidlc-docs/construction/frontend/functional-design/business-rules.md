# ビジネスルール — frontend ユニット

---

## BR-FE-01: 損益・前日比のカラー表示

| 条件 | 表示色 | Tailwind クラス |
|---|---|---|
| 数値 > 0 | 緑 | `text-green-600` |
| 数値 < 0 | 赤 | `text-red-600` |
| 数値 = 0 | 中立 | `text-gray-600` |

対象フィールド: `dailyChange`, `dailyChangePct`, `totalProfitLoss`, `totalProfitLossPct`, `valuationChange`, `profitLossChange`, `quantityDiff`, `valuationDiff`

---

## BR-FE-02: 金額フォーマット（評価額・損益）

- フォーマット: `¥1,234,567`（円記号 + 千の位区切りカンマ）
- 実装: `Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })`
- 対象: `totalValuation`, `totalProfitLoss`, `valuationChange`, `profitLossChange`

---

## BR-FE-03: パーセンテージフォーマット

- プラスの場合: `+1.82%`（プラス符号を明示）
- マイナスの場合: `-1.20%`
- ゼロの場合: `0.00%`
- 実装: `useFormatters.formatPct(value: string): string`

---

## BR-FE-04: CSVインポートフォームのデフォルト値

- PortfolioPage マウント時に `settingsStore.csvDefaultPath` を取得
- パス入力フィールドのデフォルト値として表示（ユーザーが変更可能）
- settingsStore が未ロードの場合は先にロードしてから反映

---

## BR-FE-05: HistoryPage — 差分表示の条件

- スナップショット一覧から **2つ選択** した場合にのみ差分を表示
- 選択が0または1つの場合: 差分エリアに「2つのスナップショットを選択してください」と表示
- 比較方向: from（古い日付）→ to（新しい日付）で表示
  - ユーザーが選択した順序に関わらず、日付の古い方を from・新しい方を to とする

---

## BR-FE-06: null・空値の表示

| フィールド | null時の表示 |
|---|---|
| `companyName` | `―`（ダッシュ） |
| `dividendYield` | `―` |
| `pbr` | `―` |
| `per` | `―` |
| スナップショット未存在時 | 「まだデータがありません。CSVをインポートしてください。」 |

---

## BR-FE-07: ローディング状態

- APIリクエスト中は各ページ・コンポーネントでローディングインジケーター（スピナー）を表示
- 複数リクエストが並行する場合でも、最後のリクエスト完了までローディング状態を維持
- ロード中はインポートボタン・保存ボタンを無効化（二重送信防止）

---

## BR-FE-08: エラー処理

- すべてのAPI呼び出しエラーは `AppError.vue`（グローバルエラーバナー）で表示
- エラーメッセージは `ApiError.message` フィールドを使用
- ネットワークエラーの場合: 「サーバーに接続できません。バックエンドが起動しているか確認してください。」
- エラーバナーはユーザーが手動で閉じられる（× ボタン）
- CSVインポートエラー（400 Bad Request）: エラーバナーで詳細を表示

---

## BR-FE-09: HoldingsTable のソート

- デフォルトソート: `totalValuation`（評価額）降順
- ユーザーがカラムヘッダーをクリックして昇順/降順を切り替え可能
- ソート対象カラム: 評価額・損益・損益率

---

## BR-FE-10: PromptPage のコピー

- 「コピー」ボタンクリック → `useClipboard` コンポーザブルでクリップボードにコピー
- コピー成功後、ボタンテキストを一時的に「✓ コピー完了」に変更（2秒後に元に戻す）
- `navigator.clipboard` が利用不可の場合はフォールバック（`document.execCommand('copy')`）を使用

---

## BR-FE-11: セクターグラフのカラーパレット

- Chart.js のデフォルトカラーパレットを使用（最大20セクター対応）
- 「投資信託」セクターには固定色を割り当て（グレー系: `#94a3b8`）
- 「不明」セクターには固定色を割り当て（明るいグレー: `#cbd5e1`）

---

## BR-FE-12: 差分表示（DiffView）の表示条件

- `addedTickers`, `removedTickers`, `changed` がすべて空 かつ `valuationChange == "0"` の場合: 「前回と変化なし」を表示
- それ以外: 増加銘柄・減少銘柄・変化銘柄・評価額変化を一覧表示
