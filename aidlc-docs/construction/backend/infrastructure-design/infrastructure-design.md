# Infrastructure Design — backend

---

## インフラ概要

| 項目 | 内容 |
|---|---|
| 実行環境 | ローカルPC（Docker Compose） |
| クラウド | なし |
| コンテナランタイム | Docker Engine |
| オーケストレーション | Docker Compose |

---

## コンテナ定義（backend）

### イメージ構成（マルチステージビルド）

```dockerfile
# backend/Dockerfile

# ---- Build Stage ----
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY gradlew gradlew.bat settings.gradle.kts build.gradle.kts ./
COPY gradle/ gradle/
RUN ./gradlew dependencies --no-daemon   # 依存キャッシュ層
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# ---- Run Stage ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar

# 非rootユーザーで実行（SECURITY-09）
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**ベースイメージ**: `eclipse-temurin:21-jdk` / `eclipse-temurin:21-jre`（バージョン固定、`latest`禁止）

---

## ボリューム定義

| ボリューム名 | マウント先（コンテナ内） | 用途 | ホスト側パス |
|---|---|---|---|
| `portfolio-data` | `/data` | SQLite DB + CSVファイル配置場所 | `./data/` |
| `portfolio-config` | `/config` | サービスアカウントJSONキー | `./config/` |

### ホスト側ディレクトリ

```
portfolio-insight-archiver/
├── data/
│   ├── .gitkeep          # Gitに追加（中身は .gitignore）
│   ├── portfolio.db      # SQLite（実行後に生成）
│   └── New_file.csv      # SBI証券からダウンロードしたCSVをここに置く
└── config/
    ├── .gitkeep          # Gitに追加（中身は .gitignore）
    └── sa-key.json       # Googleサービスアカウントキー（.gitignore対象）
```

**`.gitignore` 追加対象**:
```
data/*.db
data/*.csv
config/*.json
.env
```

---

## 環境変数定義

### docker-compose.yml での定義方法

```yaml
services:
  backend:
    environment:
      # 非機密（docker-compose.yml に直接記述可）
      - DB_PATH=/data/portfolio.db
      - CSV_ALLOWED_DIR=/data
      - LOG_LEVEL=INFO
      # 機密（.env ファイルから参照）
      - JQUANTS_REFRESH_TOKEN=${JQUANTS_REFRESH_TOKEN}
      - GOOGLE_SA_KEY_PATH=${GOOGLE_SA_KEY_PATH:-/config/sa-key.json}
      - GOOGLE_DRIVE_FOLDER_ID=${GOOGLE_DRIVE_FOLDER_ID}
```

### .env ファイル（ユーザーが作成・.gitignore対象）

```bash
# .env
JQUANTS_REFRESH_TOKEN=eyJhbGciOiJIUzI1NiIs...
GOOGLE_SA_KEY_PATH=/config/sa-key.json
GOOGLE_DRIVE_FOLDER_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
```

### .env.example（リポジトリにコミット）

```bash
# .env.example — コピーして .env を作成してください
JQUANTS_REFRESH_TOKEN=your_jquants_refresh_token_here
GOOGLE_SA_KEY_PATH=/config/sa-key.json
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id_here
```

---

## ネットワーク定義

```yaml
networks:
  portfolio-net:
    driver: bridge
```

| 通信 | 方式 | 備考 |
|---|---|---|
| ブラウザ → frontend | `localhost:5173` | Vite dev server |
| frontend → backend | `http://backend:8080`（Docker内）または `http://localhost:8080` | CORS: localhost:5173 許可 |
| backend → J-Quants API | HTTPS（外部） | タイムアウト 5秒 |
| backend → Google Docs API | HTTPS（外部） | タイムアウト 10秒 |
| backend → SQLite | ファイルI/O（`/data/portfolio.db`） | ボリュームマウント |

---

## ヘルスチェック

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
```

Spring Boot Actuator の `/actuator/health` エンドポイントのみ公開（他は無効化）。

---

## ログ設定

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

ログはDockerのjson-fileドライバーで管理。最大10MB × 3ファイルでローテーション。
`docker compose logs -f backend` で参照可能。

---

## セキュリティ設定（コンテナレベル）

```yaml
services:
  backend:
    security_opt:
      - no-new-privileges:true    # 特権昇格禁止
    read_only: false              # /data への書き込みが必要なため false
    cap_drop:
      - ALL                       # 全Linuxケーパビリティを削除
    cap_add:
      - NET_BIND_SERVICE          # ポートバインドに必要な場合のみ追加
```
