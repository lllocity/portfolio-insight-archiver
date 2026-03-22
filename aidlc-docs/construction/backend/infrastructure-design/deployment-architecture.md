# Deployment Architecture — backend

---

## 全体構成図

```
ホストPC（macOS / Linux）
│
├── docker-compose.yml
├── .env                          (gitignore)
├── .env.example
├── data/
│   ├── New_file.csv              (SBI証券からダウンロード)
│   └── portfolio.db              (SQLite、実行後に生成)
└── config/
    └── sa-key.json               (Googleサービスアカウントキー、gitignore)
│
└── Docker Engine
    │
    ├── [network: portfolio-net]
    │
    ├── Container: backend
    │   ├── Image: eclipse-temurin:21-jre
    │   ├── Port: 8080:8080
    │   ├── Volume: ./data → /data
    │   ├── Volume: ./config → /config (read-only)
    │   ├── Env: DB_PATH, CSV_ALLOWED_DIR, LOG_LEVEL
    │   ├── Env: JQUANTS_REFRESH_TOKEN (from .env)
    │   ├── Env: GOOGLE_SA_KEY_PATH (from .env)
    │   ├── Env: GOOGLE_DRIVE_FOLDER_ID (from .env)
    │   └── Health: /actuator/health
    │
    └── Container: frontend
        ├── Image: node:22-alpine (Vite dev)
        ├── Port: 5173:5173
        └── Env: VITE_API_BASE_URL=http://localhost:8080
```

---

## docker-compose.yml（完全版）

```yaml
version: "3.9"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: portfolio-backend
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
      - ./config:/config:ro          # read-only（キー書き込み不要）
    environment:
      - DB_PATH=/data/portfolio.db
      - CSV_ALLOWED_DIR=/data
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
      - JQUANTS_REFRESH_TOKEN=${JQUANTS_REFRESH_TOKEN}
      - GOOGLE_SA_KEY_PATH=${GOOGLE_SA_KEY_PATH:-/config/sa-key.json}
      - GOOGLE_DRIVE_FOLDER_ID=${GOOGLE_DRIVE_FOLDER_ID}
    networks:
      - portfolio-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: portfolio-frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:8080
    networks:
      - portfolio-net
    depends_on:
      backend:
        condition: service_healthy

networks:
  portfolio-net:
    driver: bridge
```

---

## 起動・停止手順

```bash
# 初回セットアップ
cp .env.example .env
# .env を編集して各トークン・IDを設定

mkdir -p data config
# config/sa-key.json を配置

# 起動
docker compose up -d

# ログ確認
docker compose logs -f backend

# 停止
docker compose down

# データ削除なし停止（SQLiteを残す）
docker compose stop
```

---

## SQLiteファイルの永続化

```
ホスト: ./data/portfolio.db
コンテナ: /data/portfolio.db（Flyway マイグレーションで初期化）
```

Flyway の初回起動時に `flyway_schema_history` テーブルが作成され、
`db/migration/` 配下のSQLスクリプトが順番に適用される。

---

## Flywayマイグレーションファイル構成

```
backend/src/main/resources/db/migration/
├── V1__create_snapshots.sql
├── V2__create_holdings.sql
├── V3__create_stock_meta_cache.sql
└── V4__create_settings.sql
```

---

## 初回セットアップチェックリスト

```
[ ] Docker Desktop がインストールされている
[ ] .env ファイルを .env.example からコピーし、各値を設定した
    [ ] JQUANTS_REFRESH_TOKEN（J-Quantsのマイページから取得）
    [ ] GOOGLE_DRIVE_FOLDER_ID（アーカイブ先フォルダのURL末尾ID）
[ ] config/sa-key.json を配置した（Google Cloud Console から取得）
[ ] サービスアカウントのメールアドレスにGoogle Driveフォルダの編集権限を付与した
[ ] docker compose up -d で起動確認
[ ] http://localhost:5173 にアクセスできる
```
