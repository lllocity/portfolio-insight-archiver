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
| `csv-import` | SBI証券CSVのパース・スナップショット保存 |
| `portfolio-latest` | 最新スナップショットの保有状況・セクター集計 |
| `snapshot-holdings` | 特定日付のスナップショット保有一覧 |
| `snapshot-sectors` | 特定日付のセクター集計 |
| `snapshot-diff` | 2スナップショット間の差分 |
| `prompt-latest` | AIプロンプト生成 |
| `dividend-refresh` | 配当情報のスクレイピング更新 |

```bash
# Edge Functions のローカル実行
npx supabase functions serve
```

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
