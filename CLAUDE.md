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
