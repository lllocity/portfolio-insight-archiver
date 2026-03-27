# Portfolio Insight Archiver - Frontend

Vue.js 3 + Vite + TypeScript + Tailwind CSS によるポートフォリオ管理フロントエンド。

## 技術スタック

- **フレームワーク**: Vue.js 3 (Composition API)
- **ビルドツール**: Vite
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **状態管理**: Pinia
- **ルーティング**: Vue Router 4
- **HTTPクライアント**: axios
- **チャート**: Chart.js + vue-chartjs
- **テスト**: Vitest + @vue/test-utils

## セットアップ

```bash
# 依存パッケージのインストール
npm install

# 開発サーバー起動（バックエンド localhost:8080 が必要）
npm run dev

# ビルド
npm run build

# ユニットテスト実行
npm run test

# 型チェック
npm run type-check
```

## 開発環境

バックエンド（Spring Boot）が `http://localhost:8080` で起動している状態で、`npm run dev` を実行してください。
`/api/*` へのリクエストは Vite のプロキシ設定により自動的にバックエンドへ転送されます。

## 画面構成

| パス | ページ | 説明 |
|---|---|---|
| `/portfolio` | PortfolioPage | 最新スナップショット表示・CSVインポート |
| `/history` | HistoryPage | 履歴一覧・スナップショット差分比較 |
| `/prompt` | PromptPage | AI分析用プロンプト生成・コピー |

## プロジェクト構造

```
frontend/
├── src/
│   ├── api/           # axiosベースAPIクライアント
│   ├── assets/        # グローバルCSS
│   ├── components/    # 再利用可能UIコンポーネント
│   ├── composables/   # 共通ロジック（フォーマット・クリップボード）
│   ├── pages/         # ページコンポーネント
│   ├── router/        # Vue Router設定
│   ├── stores/        # Piniaストア
│   └── types/         # TypeScript型定義
├── Dockerfile         # multi-stage Docker build
├── nginx.conf         # nginx設定（SPA + APIプロキシ）
└── vite.config.ts     # Vite設定
```

## Docker

```bash
# ルートディレクトリから全サービスを起動
docker compose up --build -d
```

フロントエンドは `http://localhost:5173` で公開されます。

## 別端末からのアクセス

同一WiFiネットワーク上の別端末からアクセスする場合は、ホストマシンのIPアドレスに合わせた設定が必要です。

### 1. ホストマシンのIPアドレスを確認

```bash
ipconfig getifaddr en0
```

例: `192.168.1.10`

### 2. ルートの .env を更新

```env
VITE_API_BASE_URL=http://192.168.1.10:8080
```

### 3. 再ビルドして起動

```bash
docker compose up --build -d
```

別端末のブラウザから `http://192.168.1.10:5173` でアクセスできます。
