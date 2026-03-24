# Build Instructions

## Prerequisites

| 項目 | 要件 |
|---|---|
| Java | 21 以上 |
| Gradle | 8.10.2（Wrapper 同梱） |
| Node.js | 20 以上 |
| npm | 10 以上 |
| Docker / Docker Compose | Docker Compose V2 対応（任意） |

### 必要な環境変数（バックエンド）

```bash
# .env または環境変数に設定
DB_PATH=/data/portfolio.db
CSV_ALLOWED_DIR=/data
JQUANTS_REFRESH_TOKEN=<JQuantsリフレッシュトークン>
GOOGLE_SA_KEY_PATH=/config/sa-key.json
GOOGLE_DRIVE_FOLDER_ID=<Google DriveフォルダID>
```

---

## Build Steps

### 1. バックエンドのビルド

```bash
cd backend

# 依存パッケージの解決 + コンパイル + テスト + JARパッケージング
./gradlew clean build

# テストをスキップしてビルドのみ実行する場合
./gradlew clean build -x test
```

**期待される出力**:
```
BUILD SUCCESSFUL in Xs
9 actionable tasks: 9 executed
```

**成果物**: `backend/build/libs/portfolio-*.jar`

---

### 2. フロントエンドのビルド

```bash
cd frontend

# 依存パッケージのインストール
npm install

# TypeScript型チェック
npm run type-check

# プロダクションビルド
npm run build
```

**期待される出力**:
```
✓ built in XXs
dist/index.html
dist/assets/...
```

**成果物**: `frontend/dist/`

---

### 3. Docker Compose によるフルスタックビルド

```bash
# ルートディレクトリから実行
docker compose build

# ビルドと起動を一括実行
docker compose up --build
```

**確認**: `http://localhost:5173` でフロントエンドにアクセスできること

---

## トラブルシューティング

### バックエンドビルド失敗：Javaバージョン不一致

```bash
java -version  # 21以上であることを確認
./mvnw -version
```

### フロントエンドビルド失敗：型エラー

```bash
cd frontend
npm run type-check  # エラー箇所を確認
```

### Docker ビルド失敗：ポート競合

```bash
# ポート 8080 / 5173 を使用しているプロセスを確認
lsof -i :8080
lsof -i :5173
```
