# Frontend Code Generation Plan

## Unit Context

- **Unit**: frontend
- **Location**: `frontend/`（モノレポ構成）
- **Tech**: Vue.js 3 + Vite + TypeScript + Tailwind CSS + Pinia + Vue Router + axios + Chart.js + Vitest
- **依存**: backend unit（API実装済み）+ 不足3エンドポイントを本ユニットで追加

## 実装する機能要件

FR-CSV-01/02, FR-ANALYSIS-01/02/03/04/05, FR-AI-01/02, FR-AUTH-03（設定UI）

## ユニット依存関係

| 依存先 | 内容 |
|---|---|
| backend `/api/csv/import` | CSVインポート実行 |
| backend `/api/portfolio/latest` | 最新分析結果取得 |
| backend `/api/settings` GET/PUT | 設定取得・更新 |
| backend `/api/snapshots` | ★新規追加（Step 1） |
| backend `/api/snapshots/diff` | ★新規追加（Step 1） |
| backend `/api/prompt/latest` | ★新規追加（Step 1） |

---

## Step 1: 不足バックエンドAPIの追加 [x]

既存 backend に3エンドポイントを追加する（アプリコード: `backend/src/`）。

- [x] `backend/src/main/java/com/portfolio/snapshot/dto/SnapshotListItemDto.java`
- [x] `backend/src/main/java/com/portfolio/snapshot/SnapshotQueryController.java`
  - `GET /api/snapshots` — 全スナップショット一覧（日付降順）
  - `GET /api/snapshots/diff?from={date}&to={date}` — 2スナップショット間差分
- [x] `backend/src/main/java/com/portfolio/prompt/dto/PromptResponse.java`
- [x] `backend/src/main/java/com/portfolio/prompt/PromptController.java`
  - `GET /api/prompt/latest` — 最新スナップショットからプロンプト生成・返却
- [x] `SnapshotService` に `findAll()` / `findByDate(LocalDate)` を追加
- [x] バックエンドのユニットテスト追加（`SnapshotQueryControllerTest`）

---

## Step 2: プロジェクト構造セットアップ [x]

frontendプロジェクトの骨格ファイルを作成する（アプリコード: `frontend/`）。

- [ ] `frontend/package.json`（vue3 + vite + typescript + pinia + vue-router + axios + chart.js + vue-chartjs + tailwindcss + vitest + @vitejs/plugin-vue）
- [ ] `frontend/vite.config.ts`（`/api` → `http://localhost:8080` プロキシ設定）
- [ ] `frontend/tsconfig.json` + `frontend/tsconfig.app.json` + `frontend/tsconfig.node.json`
- [ ] `frontend/tailwind.config.js` + `frontend/postcss.config.js`
- [ ] `frontend/vitest.config.ts`
- [ ] `frontend/index.html`
- [ ] `frontend/.env.example`
- [ ] `frontend/.gitignore`

---

## Step 3: TypeScript 型定義 [x]

バックエンドAPIレスポンスに対応する型を定義する（アプリコード: `frontend/src/types/`）。

- [ ] `frontend/src/types/portfolio.ts`（PortfolioResponse・EnrichedHolding・SectorAllocation・SnapshotDiff等）
- [ ] `frontend/src/types/snapshot.ts`（SnapshotListItem）
- [ ] `frontend/src/types/prompt.ts`（PromptResponse）
- [ ] `frontend/src/types/import.ts`（CsvImportRequest・ImportResult）
- [ ] `frontend/src/types/settings.ts`（Settings）
- [ ] `frontend/src/types/api.ts`（ApiError共通型）

---

## Step 4: APIクライアント層 [x]

axios ベース設定とエンドポイント別クライアント（アプリコード: `frontend/src/api/`）。

- [ ] `frontend/src/api/client.ts`（axios インスタンス・エラーインターセプター）
- [ ] `frontend/src/api/csvApi.ts`（POST /api/csv/import）
- [ ] `frontend/src/api/portfolioApi.ts`（GET /api/portfolio/latest）
- [ ] `frontend/src/api/snapshotApi.ts`（GET /api/snapshots・GET /api/snapshots/diff）
- [ ] `frontend/src/api/promptApi.ts`（GET /api/prompt/latest）
- [ ] `frontend/src/api/settingsApi.ts`（GET/PUT /api/settings）

---

## Step 5: Pinia ストア [x]

グローバル状態管理（アプリコード: `frontend/src/stores/`）。

- [ ] `frontend/src/stores/portfolioStore.ts`（data・loading・error・load()・reload()）
- [ ] `frontend/src/stores/settingsStore.ts`（settings・loading・error・load()・update()）

---

## Step 6: コンポーザブル + テスト [x]

共通ロジックとユニットテスト（アプリコード: `frontend/src/composables/`）。

- [ ] `frontend/src/composables/useFormatters.ts`（formatCurrency・formatPct・colorClass・nullish）
- [ ] `frontend/src/composables/useClipboard.ts`（copy・フォールバック対応）
- [ ] `frontend/src/composables/__tests__/useFormatters.test.ts`
- [ ] `frontend/src/composables/__tests__/useClipboard.test.ts`

---

## Step 7: 共通コンポーネント + テスト [x]

再利用可能なUIコンポーネント（アプリコード: `frontend/src/components/`）。

- [ ] `frontend/src/components/AppError.vue`（グローバルエラーバナー・`data-testid="app-error"`）
- [ ] `frontend/src/components/SummaryCard.vue`（ラベル・値・カラー・`data-testid`）
- [ ] `frontend/src/components/DiffView.vue`（差分表示・空状態・`data-testid`）
- [ ] `frontend/src/components/__tests__/SummaryCard.test.ts`
- [ ] `frontend/src/components/__tests__/DiffView.test.ts`

---

## Step 8: データコンポーネント [x]

テーブル・グラフ・フォーム（アプリコード: `frontend/src/components/`）。

- [ ] `frontend/src/components/HoldingsTable.vue`（ソート対応・`data-testid`・null表示「―」）
- [ ] `frontend/src/components/SectorChart.vue`（Chart.js ドーナツ・凡例テーブル）
- [ ] `frontend/src/components/CsvImportForm.vue`（パス入力・インポートボタン・結果表示・`data-testid`）
- [ ] `frontend/src/components/__tests__/HoldingsTable.test.ts`

---

## Step 9: アプリ基盤 [x]

Vue Router・App Shell（アプリコード: `frontend/src/`）。

- [ ] `frontend/src/router/index.ts`（4ルート定義）
- [ ] `frontend/src/App.vue`（タブナビゲーション・AppError・RouterView）
- [ ] `frontend/src/main.ts`（Vue app初期化・Pinia・Router登録）

---

## Step 10: PortfolioPage [x]

最新スナップショット表示ページ（アプリコード: `frontend/src/pages/`）。

- [ ] `frontend/src/pages/PortfolioPage.vue`
  - CsvImportForm（インポート後 portfolioStore.reload()）
  - SummaryCard × 3（総評価額・総損益・銘柄数）
  - SectorChart（sectors データ）
  - HoldingsTable（holdings データ）
  - DiffView（diff データ）
  - 空状態（スナップショットなし）の表示

---

## Step 11: HistoryPage [x]

スナップショット履歴・差分比較ページ（アプリコード: `frontend/src/pages/`）。

- [x] `frontend/src/pages/HistoryPage.vue`
  - スナップショット一覧テーブル（チェックボックス選択・最大2つ）
  - 2選択時に `GET /api/snapshots/diff` 自動実行
  - DiffView コンポーネントで差分表示

---

## Step 12: PromptPage + SettingsPage [x]

AIプロンプト・設定ページ（アプリコード: `frontend/src/pages/`）。

- [x] `frontend/src/pages/PromptPage.vue`
  - GET /api/prompt/latest → textarea表示
  - コピーボタン（useClipboard）・再生成ボタン
- [x] `frontend/src/pages/SettingsPage.vue`
  - CSVデフォルトパス・Google DriveフォルダID入力
  - PUT /api/settings で保存

---

## Step 13: Dockerfile + docker-compose.yml 更新 [x]

コンテナ化・全サービス統合（アプリコード: ルート + `frontend/`）。

- [x] `frontend/Dockerfile`（multi-stage: node build → nginx runtime、`/api` nginx プロキシ設定）
- [x] `frontend/nginx.conf`（SPA fallback + `/api` proxy to backend）
- [x] `docker-compose.yml` 更新（frontend サービス追加・ポート 5173）※既に存在

---

## Step 14: ドキュメント [x]

- [x] `frontend/README.md`（セットアップ・開発手順）
- [x] `aidlc-docs/construction/frontend/code/code-summary.md`（生成ファイル一覧）

---

## ファイル数サマリー

| カテゴリ | ファイル数 |
|---|---|
| バックエンド追加（Step 1） | 約 6 |
| フロントエンド設定（Step 2） | 約 8 |
| 型定義（Step 3） | 6 |
| APIクライアント（Step 4） | 6 |
| ストア（Step 5） | 2 |
| コンポーザブル + テスト（Step 6） | 4 |
| 共通コンポーネント + テスト（Step 7） | 5 |
| データコンポーネント + テスト（Step 8） | 4 |
| アプリ基盤（Step 9） | 3 |
| ページ（Step 10〜12） | 4 |
| Docker（Step 13） | 3 |
| ドキュメント（Step 14） | 2 |
| **合計** | **約 53** |
