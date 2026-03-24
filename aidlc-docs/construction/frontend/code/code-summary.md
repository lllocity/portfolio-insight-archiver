# Frontend Unit - コード生成サマリー

## 生成ファイル一覧

### Step 1: バックエンド追加API

| ファイル | 種別 | 説明 |
|---|---|---|
| `backend/src/main/java/com/portfolio/snapshot/dto/SnapshotListItemDto.java` | 新規 | GET /api/snapshots レスポンスDTO |
| `backend/src/main/java/com/portfolio/snapshot/SnapshotQueryController.java` | 新規 | GET /api/snapshots・GET /api/snapshots/diff エンドポイント |
| `backend/src/main/java/com/portfolio/prompt/dto/PromptResponse.java` | 新規 | GET /api/prompt/latest レスポンスDTO |
| `backend/src/main/java/com/portfolio/prompt/PromptController.java` | 新規 | GET /api/prompt/latest エンドポイント |
| `backend/src/main/java/com/portfolio/snapshot/SnapshotRepository.java` | 修正 | findAllByOrderBySnapshotDateDesc() を追加 |
| `backend/src/main/java/com/portfolio/snapshot/SnapshotService.java` | 修正 | findAll() / findByDate(LocalDate) を追加 |
| `backend/src/test/java/com/portfolio/snapshot/SnapshotQueryControllerTest.java` | 新規 | 4テストケース |

### Step 2: プロジェクト設定

| ファイル | 説明 |
|---|---|
| `frontend/package.json` | 依存パッケージ定義（vue3, vite, ts, pinia, vue-router, axios, chart.js, tailwindcss, vitest） |
| `frontend/vite.config.ts` | Vite設定（/api プロキシ → localhost:8080） |
| `frontend/tsconfig.json` | TypeScript設定（参照構成） |
| `frontend/tsconfig.app.json` | アプリ用TypeScript設定 |
| `frontend/tsconfig.node.json` | Node.js（vite.config.ts）用TypeScript設定 |
| `frontend/tailwind.config.js` | Tailwind CSS設定 |
| `frontend/postcss.config.js` | PostCSS設定 |
| `frontend/vitest.config.ts` | Vitestテスト設定（jsdom環境） |
| `frontend/index.html` | SPAエントリーポイント |
| `frontend/.env.example` | 環境変数サンプル |
| `frontend/.gitignore` | Git除外設定 |

### Step 3: TypeScript型定義

| ファイル | 説明 |
|---|---|
| `frontend/src/types/portfolio.ts` | PortfolioResponse, EnrichedHolding, SectorAllocation, SnapshotDiff 等 |
| `frontend/src/types/snapshot.ts` | SnapshotListItem |
| `frontend/src/types/prompt.ts` | PromptResponse |
| `frontend/src/types/import.ts` | CsvImportRequest, ImportResult |
| `frontend/src/types/settings.ts` | Settings |
| `frontend/src/types/api.ts` | ApiError |

### Step 4: APIクライアント層

| ファイル | 説明 |
|---|---|
| `frontend/src/api/client.ts` | axiosインスタンス + エラーインターセプター |
| `frontend/src/api/portfolioApi.ts` | fetchLatestPortfolio（204対応） |
| `frontend/src/api/csvApi.ts` | importCsv |
| `frontend/src/api/snapshotApi.ts` | fetchSnapshots, fetchSnapshotDiff |
| `frontend/src/api/promptApi.ts` | fetchLatestPrompt（204対応） |
| `frontend/src/api/settingsApi.ts` | fetchSettings, updateSettings |

### Step 5: Pinia ストア

| ファイル | 説明 |
|---|---|
| `frontend/src/stores/portfolioStore.ts` | data/loading/error/load()/reload() |
| `frontend/src/stores/settingsStore.ts` | settings/loading/error/load()/update() |

### Step 6: コンポーザブル + テスト

| ファイル | 説明 |
|---|---|
| `frontend/src/composables/useFormatters.ts` | formatCurrency・formatPct・colorClass・nullish |
| `frontend/src/composables/useClipboard.ts` | copy() + execCommandフォールバック |
| `frontend/src/composables/__tests__/useFormatters.test.ts` | 12テストケース |
| `frontend/src/composables/__tests__/useClipboard.test.ts` | 2テストケース |

### Step 7: 共通コンポーネント + テスト

| ファイル | 説明 |
|---|---|
| `frontend/src/components/AppError.vue` | グローバルエラーバナー（data-testid="app-error"） |
| `frontend/src/components/SummaryCard.vue` | ラベル・値・colorClass props |
| `frontend/src/components/DiffView.vue` | 差分表示（追加/除去/変化銘柄） |
| `frontend/src/components/__tests__/SummaryCard.test.ts` | SummaryCardテスト |
| `frontend/src/components/__tests__/DiffView.test.ts` | DiffViewテスト |

### Step 8: データコンポーネント + テスト

| ファイル | 説明 |
|---|---|
| `frontend/src/components/HoldingsTable.vue` | ソート対応テーブル（data-testid付き） |
| `frontend/src/components/SectorChart.vue` | Chart.js Doughnut + 凡例テーブル |
| `frontend/src/components/CsvImportForm.vue` | パス入力・インポートボタン・結果表示 |
| `frontend/src/components/__tests__/HoldingsTable.test.ts` | HoldingsTableテスト |

### Step 9: アプリ基盤

| ファイル | 説明 |
|---|---|
| `frontend/src/router/index.ts` | 4ルート（/portfolio, /history, /prompt, /settings） |
| `frontend/src/assets/main.css` | Tailwind CSS エントリーポイント |
| `frontend/src/App.vue` | タブナビゲーション・AppError・RouterView |
| `frontend/src/main.ts` | Vue app初期化・Pinia・Router登録 |

### Step 10: PortfolioPage

| ファイル | 説明 |
|---|---|
| `frontend/src/pages/PortfolioPage.vue` | CsvImportForm + SummaryCard×3 + SectorChart + HoldingsTable + DiffView |

### Step 11: HistoryPage

| ファイル | 説明 |
|---|---|
| `frontend/src/pages/HistoryPage.vue` | スナップショット一覧（チェックボックス2選択）+ 自動差分取得 + DiffView |

### Step 12: PromptPage + SettingsPage

| ファイル | 説明 |
|---|---|
| `frontend/src/pages/PromptPage.vue` | プロンプトtextarea + コピー・再生成ボタン |
| `frontend/src/pages/SettingsPage.vue` | CSVパス・DriveフォルダID設定フォーム |

### Step 13: Docker

| ファイル | 説明 |
|---|---|
| `frontend/Dockerfile` | multi-stage: node20 build → nginx1.25 runtime |
| `frontend/nginx.conf` | SPA fallback + /api proxy to backend:8080 |
| `docker-compose.yml` | frontend サービス追加（ポート5173） |

---

## ファイル数合計

| カテゴリ | ファイル数 |
|---|---|
| バックエンド追加（Step 1） | 7 |
| フロントエンド設定（Step 2） | 11 |
| 型定義（Step 3） | 6 |
| APIクライアント（Step 4） | 6 |
| ストア（Step 5） | 2 |
| コンポーザブル + テスト（Step 6） | 4 |
| 共通コンポーネント + テスト（Step 7） | 5 |
| データコンポーネント + テスト（Step 8） | 4 |
| アプリ基盤（Step 9） | 4 |
| ページ（Step 10〜12） | 4 |
| Docker（Step 13） | 3 |
| **合計** | **56** |
