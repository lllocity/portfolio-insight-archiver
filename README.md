# portfolio-insight-archiver

日本株ポートフォリオのスナップショットを記録・分析するWebアプリケーション。

SBI証券のCSVをインポートし、保有銘柄の履歴管理・差分比較・セクター分析・AIプロンプト生成を行います。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Vue 3 / TypeScript / Vite / TailwindCSS |
| バックエンド | Spring Boot / Java |
| データベース | SQLite |
| インフラ | Docker / Docker Compose |

## 起動手順

### 1. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を開き、必要な値を設定します:

| 変数 | 説明 | デフォルト |
|---|---|---|
| `JQUANTS_API_KEY` | J-Quantsのマイページから取得 | なし（必須） |
| `LOG_LEVEL` | `INFO` / `DEBUG` / `WARN` | `INFO` |
| `VITE_API_BASE_URL` | バックエンドのURL | `http://localhost:8080` |

> 同一WiFiの別端末からアクセスする場合は `VITE_API_BASE_URL` の設定が必要です。詳細は[別端末からのアクセス](#別端末からのアクセス)を参照してください。

### 2. 起動（バックグラウンド）

```bash
docker compose up --build -d
```

| サービス | URL |
|---|---|
| フロントエンド | http://localhost:5173 |
| バックエンドAPI | http://localhost:8080 |

### 3. ログ確認

```bash
docker compose logs -f
```

### 4. 停止

```bash
docker compose down
```

---

## 別端末からのアクセス

同一WiFiネットワーク上の別端末（スマートフォン・タブレット等）からアクセスする手順です。

### 1. ホストマシンのIPアドレスを確認

```bash
ipconfig getifaddr en0
```

例: `192.168.1.10`

### 2. .env を更新

```env
VITE_API_BASE_URL=http://192.168.1.10:8080
```

### 3. 再ビルドして起動

```bash
docker compose up --build -d
```

### 4. 別端末からアクセス

ブラウザで `http://192.168.1.10:5173` を開きます。

> **注意**: 自宅・社内LANなど信頼できるネットワーク内でのみ使用してください。

---

## データの永続化

`./data/` ディレクトリにSQLiteデータベースが保存されます。コンテナを削除してもデータは残ります。
