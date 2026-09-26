# portfolio-insight-archiver

日本株ポートフォリオのスナップショットを記録・分析するWebアプリケーション。

SBI証券の保有銘柄一覧CSVをインポートし、履歴管理・差分比較・セクター分析・AIプロンプト生成を行います。

## 機能

- **CSVインポート** — SBI証券の保有銘柄一覧CSVを取り込み、スナップショットとして保存。過去日付の指定も可能
- **スナップショット履歴** — 日付ごとの保有状況を蓄積・閲覧
- **差分比較** — 2スナップショット間の追加・売却・数量変化を表示
- **セクター分析** — 東証33業種分類による構成比の円グラフ表示
- **J-Quants連携** — 企業名・セクター情報を自動取得（24時間キャッシュ）
- **銘柄メモ** — 銘柄ごとに最大100文字のメモを保存
- **AIプロンプト生成** — ChatGPT / Claude へのポートフォリオ分析依頼用プロンプトを自動生成

## 画面

| ページ | URL | 内容 |
|---|---|---|
| ポートフォリオ | `/portfolio` | 最新保有状況・CSVインポート・セクター分析・差分表示 |
| 履歴 | `/history` | スナップショット一覧・任意2時点の差分比較 |
| AIプロンプト | `/prompt` | 分析依頼プロンプトの生成・コピー |

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Vue 3 (Composition API) / TypeScript / Vite / TailwindCSS / Pinia / Vue Router |
| バックエンド/BaaS | Supabase (PostgreSQL / Auth / Edge Functions) |
| 認証 | Supabase Auth (Google OAuth) |
| デプロイ (FE) | Vercel |
| デプロイ (Edge Functions) | Supabase |

## セットアップ

### 1. 環境変数の設定

```bash
cp frontend/.env.local.example frontend/.env.local
```

`frontend/.env.local` を開き、Supabase プロジェクトの値を設定します。

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

値は [Supabase ダッシュボード](https://supabase.com/dashboard) > Project Settings > API で確認できます。

### 2. 依存パッケージのインストール

```bash
cd frontend && npm install
```

### 3. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:5173` でアプリが起動します。Google アカウントでログインして使用できます。

## Edge Functions 一覧

| Function | 説明 |
|---|---|
| `csv-import` | SBI証券CSVのパース・スナップショット保存（銘柄ごとに株式／投資信託を判定し `holdings.is_stock` に保存） |
| `portfolio-latest` | 最新スナップショットの保有状況・セクター集計 |
| `snapshot-holdings` | 特定日付のスナップショット保有一覧 |
| `snapshot-sectors` | 特定日付のセクター集計 |
| `snapshot-diff` | 2スナップショット間の差分 |
| `daily-change-ranking` | 各スナップショット日の前日比騰落率／騰落幅（株式のみ・評価額加重）。集計は DB 関数 `daily_change_by_snapshot` で実施 |
| `prompt-latest` | AIプロンプト生成 |
| `dividend-refresh` | 配当情報のスクレイピング更新 |

```bash
# Edge Functions のローカル実行
npx supabase functions serve
```

## DB 関数

| 関数 | 説明 |
|---|---|
| `daily_change_by_snapshot()` | スナップショット日ごとの株式部分（`holdings.is_stock`）の騰落幅・前日評価額を jsonb 配列で返す（呼び出しユーザー分のみ・`authenticated` のみ実行可） |

DB 関数は集計・絞り込みのみに限定し、判定ルールや計算式は TypeScript 側に置く方針です（詳細は CLAUDE.md「DB 関数の線引き」）。

## DB マイグレーションの適用

リモートのマイグレーション履歴は管理していないため、`supabase db push` は使わず SQL を直接実行して適用します。

```bash
npx supabase db query --linked -f supabase/migrations/NNN_xxx.sql
```

## データ取得の注意（PostgREST の返却行数上限）

PostgREST は1リクエストあたりの返却行数に上限（既定 1000 行）があり、超過分は黙って切り捨てられます。

- 増え続けるテーブルの全件取得は `frontend/src/lib/fetchAll.ts` でページング取得する（スナップショット一覧・実現損益・受取配当）
- 大量行の集計は Edge Function に転送せず DB 関数で行う（日次騰落率ランキング）

## 開発コマンド

```bash
cd frontend

npm run dev          # 開発サーバー起動
npm run build        # Vercel デプロイ用ビルド（型チェック含む）
npm run test         # ユニットテスト（Vitest）
```

---

## 対応CSVフォーマット

SBI証券の「保有銘柄一覧」CSVに対応しています。

- **エンコーディング**: Shift-JIS (MS932)
- **対応セクション**: 特定口座 / 一般口座 / 信用建玉 / NISA口座 / 投資信託

| 銘柄コード形式 | 例 | 備考 |
|---|---|---|
| 4桁数字 | `7203`（トヨタ自動車） | 通常の上場株式 |
| 英数字混在 | `186A`（アストロスケール） | 東証グロース等 |
| ファンド名 | `ニッセイ日経平均インデックス` | 投資信託（そのままコードとして保存） |

同一銘柄が複数セクションに分かれている場合は自動的に集計します（加重平均取得単価）。
