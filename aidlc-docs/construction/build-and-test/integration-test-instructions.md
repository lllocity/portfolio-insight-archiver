# Integration Test Instructions

## 目的

フロントエンド（Vue.js）とバックエンド（Spring Boot）が連携して正しく動作することを確認する。

---

## テスト環境のセットアップ

### 1. バックエンドを起動

```bash
cd backend
./mvnw spring-boot:run
# または
java -jar target/portfolio-*.jar
```

バックエンドが `http://localhost:8080/actuator/health` で応答することを確認：

```bash
curl http://localhost:8080/actuator/health
# {"status":"UP"} が返ること
```

### 2. フロントエンド開発サーバーを起動

```bash
cd frontend
npm run dev
# http://localhost:5173 でアクセス可能
```

---

## 統合テストシナリオ

### シナリオ 1: CSVインポート → ポートフォリオ表示

1. `http://localhost:5173/portfolio` を開く
2. CSVファイルのパスを入力して「インポート」ボタンをクリック
3. **期待結果**: 総評価額・損益・銘柄数のサマリーカードが表示される
4. セクターグラフと保有銘柄テーブルが表示される

### シナリオ 2: 履歴一覧 → 差分比較

1. `http://localhost:5173/history` を開く
2. 2つ以上のスナップショットがある場合、チェックボックスで2つ選択
3. **期待結果**: 差分（追加・除去・変化した銘柄）が DiffView に表示される
4. 3つ目を選択すると最初の選択が自動的に解除される

### シナリオ 3: AIプロンプト生成

1. `http://localhost:5173/prompt` を開く
2. **期待結果**: 最新スナップショットから生成されたプロンプトが textarea に表示される
3. 「コピー」ボタンでクリップボードにコピーされる
4. 「再生成」ボタンで再度 API が呼ばれプロンプトが更新される

### シナリオ 4: 設定の保存・反映

1. `http://localhost:5173/settings` を開く
2. CSVデフォルトパスを入力して「保存」ボタンをクリック
3. **期待結果**: 「設定を保存しました。」メッセージが表示される
4. `/portfolio` に移動すると CsvImportForm の初期値に設定したパスが反映されている

---

## APIエンドポイント動作確認（curl）

```bash
# スナップショット一覧
curl http://localhost:8080/api/snapshots

# 差分取得（日付は実際のスナップショット日付に変更）
curl "http://localhost:8080/api/snapshots/diff?from=2025-01-01&to=2025-02-01"

# 最新プロンプト
curl http://localhost:8080/api/prompt/latest

# 設定取得
curl http://localhost:8080/api/settings

# 設定保存
curl -X PUT http://localhost:8080/api/settings \
  -H "Content-Type: application/json" \
  -d '{"csvDefaultPath":"/data/portfolio.csv","googleDriveFolderId":null}'
```

---

## クリーンアップ

```bash
# 開発サーバー停止: Ctrl+C
# Docker Compose 使用時
docker compose down
```
