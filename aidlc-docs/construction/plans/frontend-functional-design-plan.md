# Frontend Functional Design Plan

## Unit Context

- **Unit**: frontend
- **Location**: `frontend/` (モノレポ構成)
- **Tech**: Vue.js 3 + Vite + TypeScript + Pinia + Vue Router + axios + Chart.js

## 既存バックエンドAPIサマリー

| エンドポイント | 用途 | ステータス |
|---|---|---|
| `POST /api/csv/import` | CSVインポート実行 | ✅ 実装済 |
| `GET /api/portfolio/latest` | 最新スナップショット + 分析結果 | ✅ 実装済 |
| `GET /api/settings` | 設定取得 | ✅ 実装済 |
| `PUT /api/settings` | 設定更新 | ✅ 実装済 |
| `GET /api/snapshots` | スナップショット一覧 | ❌ 未実装 |
| `GET /api/snapshots/{date}/diff` | 指定日との差分 | ❌ 未実装 |
| `GET /api/prompt/latest` | 最新AIプロンプト取得 | ❌ 未実装 |

---

## 実装ステップ

### Step 1: 不足バックエンドAPIの追加 [ ]

HistoryPage・PromptPage が必要とする未実装エンドポイントを Spring Boot 側に追加する。

- [ ] `GET /api/snapshots` — スナップショット一覧（日付・評価額）
- [ ] `GET /api/snapshots/{date}/diff` — 特定日スナップショットと最新の差分
- [ ] `GET /api/prompt/latest` — 最新スナップショットからプロンプト生成・返却

### Step 2: プロジェクト構造セットアップ [ ]

- [ ] `frontend/package.json`（Vue 3 + Vite + TypeScript + Pinia + Vue Router + axios + Chart.js）
- [ ] `frontend/vite.config.ts`（proxy設定: `/api` → `http://backend:8080`）
- [ ] `frontend/tsconfig.json`
- [ ] `frontend/.env.example`
- [ ] `frontend/Dockerfile`（multi-stage: node build / nginx runtime）

### Step 3: TypeScript型定義 [ ]

バックエンドAPIレスポンスに対応する TypeScript インターフェース。

- [ ] `frontend/src/types/portfolio.ts`
- [ ] `frontend/src/types/snapshot.ts`
- [ ] `frontend/src/types/settings.ts`

### Step 4: APIクライアント層 [ ]

- [ ] `frontend/src/api/csvApi.ts` — `POST /api/csv/import`
- [ ] `frontend/src/api/portfolioApi.ts` — `GET /api/portfolio/latest`
- [ ] `frontend/src/api/snapshotApi.ts` — `GET /api/snapshots`, `GET /api/snapshots/{date}/diff`
- [ ] `frontend/src/api/promptApi.ts` — `GET /api/prompt/latest`
- [ ] `frontend/src/api/settingsApi.ts` — `GET/PUT /api/settings`

### Step 5: Pinia ストア [ ]

- [ ] `frontend/src/stores/portfolioStore.ts`
- [ ] `frontend/src/stores/settingsStore.ts`

### Step 6: コンポーザブル [ ]

- [ ] `frontend/src/composables/useClipboard.ts`
- [ ] `frontend/src/composables/useFormatters.ts`（円・%・損益のフォーマット）

### Step 7: 共通コンポーネント [ ]

- [ ] `frontend/src/components/HoldingsTable.vue`
- [ ] `frontend/src/components/SectorChart.vue`（Chart.js）
- [ ] `frontend/src/components/SummaryCard.vue`
- [ ] `frontend/src/components/DiffView.vue`
- [ ] `frontend/src/components/CsvImportForm.vue`
- [ ] `frontend/src/components/AppError.vue`（グローバルエラー表示）

### Step 8: ページコンポーネント [ ]

- [ ] `frontend/src/pages/PortfolioPage.vue`
- [ ] `frontend/src/pages/HistoryPage.vue`
- [ ] `frontend/src/pages/PromptPage.vue`
- [ ] `frontend/src/pages/SettingsPage.vue`

### Step 9: アプリ基盤 [ ]

- [ ] `frontend/src/router/index.ts`（Vue Router 4）
- [ ] `frontend/src/App.vue`（タブナビゲーション）
- [ ] `frontend/src/main.ts`

### Step 10: Dockerfileとdocker-compose更新 [ ]

- [ ] `frontend/Dockerfile`（nginx静的配信）
- [ ] `docker-compose.yml` に frontend サービスを追加

---

## 設計上の確認事項（ユーザー回答待ち）

**Q1: 不足バックエンドAPIの対応方針**

HistoryPage（スナップショット一覧・差分）および PromptPage（プロンプト取得）に必要な3エンドポイントがバックエンドに未実装です。
frontend ユニットのコード生成時に、これらのバックエンドエンドポイントも一緒に追加してよいですか？

[Answer]: YES

---

**Q2: セクターグラフの種類**

要件では「棒グラフまたはパイチャート」とされています。どちらを使用しますか？

A: ドーナツチャート（パイチャート）
B: 横棒グラフ（セクター名と構成比を並べて表示）
C: 両方実装（タブ切り替え）

[Answer]: A

---

**Q3: UIスタイリング**

CSSフレームワーク / スタイリング方針はありますか？

A: 素のCSS（カスタムスタイル）
B: Tailwind CSS
C: Vuetify（Vue専用マテリアルUIライブラリ）
D: PrimeVue

[Answer]: B

---

**Q4: HistoryPage の差分比較操作**

スナップショット一覧から「どの2つを比較するか」の操作方法はどうしますか？

A: 一覧から1つ選択 → 常に「最新スナップショットとの差分」を表示
B: 一覧から2つ選択 → 選択した2つの間の差分を表示

[Answer]: B

---

**Q5: CSVインポートフォームのパス入力**

PortfolioPage のCSVインポートフォームについて：

A: SettingsPage で保存したデフォルトパスを自動でフォームに表示する（ユーザーは変更可能）
B: 毎回手入力する（デフォルト値なし）

[Answer]: A

---

**Q6: 損益のカラー表示**

損益・前日比の数値をプラス（緑）・マイナス（赤）でカラー表示しますか？

A: はい（プラスは緑、マイナスは赤）
B: いいえ（カラーなし・単色）

[Answer]: A

---

**Q7: 数値フォーマット**

金額・数量の表示フォーマットを確認します。

A: 円（¥1,234,567 形式）+ 千の位区切りカンマ
B: そのまま表示（区切りなし）

[Answer]: A
