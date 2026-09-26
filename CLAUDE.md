# CLAUDE.md (portfolio-insight-archiver)

## プロジェクト概要
SBI証券のCSVデータをインポートし、ポートフォリオの推移・分析・AI分析プロンプト生成を行う個人用Webアプリケーション。Googleアカウントでログインし、ユーザーごとに独立したポートフォリオデータを管理する。

## 技術スタック
- **Frontend:** Vue 3 (Composition API), TypeScript, Vite, TailwindCSS, Pinia, Vue Router
- **Deployment (FE):** Vercel
- **Backend/BaaS:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Auth:** Supabase Auth (Google OAuth)

## アーキテクチャ方針
- バックエンドサーバーは持たない（Supabase のみ、追加費用ゼロ）
- 複雑なロジックは Supabase Edge Functions (TypeScript/Deno) で実装
- 単純なCRUDは Supabase PostgREST で自動対応
- ユーザーごとのデータ分離（RLS で `auth.uid() = user_id`）
- Vercel Hobby + Supabase Free 枠内に収める

## 🧐 クロスレビュー＆壁打ちプロセス（最重要ルール）

1. **プランモードでの壁打ち徹底**
   - 勝手にコード生成・実装に入ってはならない。まずプランモードにて設計・アーキテクチャをユーザーと壁打ちすること。
   - 複数案を比較検討して提示し、ユーザーが選択できるようにすること。

2. **クロスチェック（多角的な要件検証）**
   - 新機能追加・修正時は既存機能への影響をクロスレビューすること。
   - RLS ポリシーの漏れ・抜けがないか、全テーブルを横断して確認すること。

3. **レビュー観点**
   - **RLS の網羅性**: 全テーブルに適切なポリシーが設定されているか
   - **Edge Functions のエラーハンドリング**: 外部API（J-Quants、Yahoo Finance）の障害時に適切に対処しているか
   - **Supabase 無料枠**: DB 500MB・Edge Functions 月500万req の制限内に収まるか
   - **認証フロー**: 未認証ユーザーがデータにアクセスできる経路がないか

## データ設計方針
- `user_id UUID` をユーザー固有データのテーブルに付与（snapshots, holdings, stock_memo, settings）
- `stock_meta_cache` は市場データキャッシュのため全ユーザー共有（user_id なし）
- DBマイグレーションは `supabase/migrations/` で管理
- **マイグレーションの適用は SQL の直接実行で行う**（`npx supabase db query --linked -f supabase/migrations/NNN_xxx.sql`）。リモートのマイグレーション履歴は空のため、`supabase db push` は 001 から再実行しようとして壊れる。使用禁止

## データ取得・集計の方針（行数増加への備え）
- PostgREST は1リクエストの返却行数に上限（max_rows、既定1000行）があり、**超過分はエラーにならず黙って切り捨てられる**
- 行数が増え続けるテーブル（snapshots / holdings / realized_pnl / dividends）を全件取得する場合は、フロントは `frontend/src/lib/fetchAll.ts` の `fetchAll` を使う（`.range()` を付けないクエリを返す関数を渡す。範囲指定は `fetchAll` が行う）。並び順は必ず一意にする（同一日付が複数行あり得るテーブルは `id` を第2ソートキーに）
- 株式／投資信託の判定は証券コード形式（`isStockCode`）で行う。定義は `frontend/src/lib/assetType.ts`・`supabase/functions/_shared/asset-type.ts` の2箇所（変更時は両方を揃える）。holdings には取り込み時に判定結果を `is_stock` 列として保存しており、ルールを変えた場合は既存行も新規マイグレーションで再設定する（`008` 参照）

## DB 関数の線引き
ロジックは原則 TypeScript（Edge Functions / フロント）に置く。DB 関数はテストが書けず障害の追跡も難しいため、**「大量行を DB の外へ運ぶこと自体が問題になる単純な集計」に限って**使う。

| DB 関数に置いてよいもの | TypeScript に置くもの |
|---|---|
| 集合の集計（SUM / COUNT / GROUP BY）、列による絞り込み | 判定ルール（株式か否か等）、計算式、丸め、表示用の整形 |
| 整合性の保証（制約・RLS） | 条件分岐のある処理、外部 API 連携 |

- 判定ルールが集計に必要なときは、SQL に書かず、取り込み時に TypeScript で判定した結果を列として保存し、SQL はその列で絞り込む（例: `holdings.is_stock`）
- DB 関数は `SECURITY INVOKER` ＋ `auth.uid()` で自ユーザーに限定し、anon には `EXECUTE` を付与しない。結果が1000行を超え得る場合はスカラー（jsonb 配列）で返す（例: `daily_change_by_snapshot`）
- DB 関数を追加・変更した場合は、自動テストの代わりとなる検証方法（本番画面での変更前後比較など）を実施し、PR やコミットに記録する

## ディレクトリ構成
```
portfolio-insight-archiver/
├── frontend/          # Vue 3 フロントエンド
├── supabase/
│   ├── migrations/    # PostgreSQL マイグレーション SQL
│   └── functions/     # Edge Functions (TypeScript/Deno)
└── scripts/           # データ移管スクリプト等
```

## 開発コマンド
- `cd frontend && npm run dev` : 開発サーバー起動
- `cd frontend && npm run build` : Vercel デプロイ用ビルド
- `cd frontend && npm run test` : テスト全件実行（Vitest）
- `npx supabase functions serve` : Edge Functions ローカル実行

## コーディング規約
- TypeScript の型定義を厳格に行うこと
- Supabase クライアントは `src/lib/supabase.ts` に集約する
- 環境変数は `.env.local`（ローカル）・Vercel 環境変数（本番）で管理
- Edge Functions は `supabase/functions/{function-name}/index.ts` に配置

## テストポリシー
- 新機能・バグ修正時は対応するユニットテストを並行して作成すること
- テストフレームワーク: Vitest
- Supabase クライアントは `vi.mock` でモックし、DB に依存しない形にする
- `npm run test` でテスト全件通過を確認してからコミットする
