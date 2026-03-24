# Performance Test Instructions

## 適用範囲

本プロジェクトはシングルユーザーの個人ポートフォリオ管理ツールであるため、大規模な負荷テストは **N/A** とする。

ただし、以下の基本的なレスポンスタイム確認は推奨する。

---

## 基本的なレスポンスタイム確認

### バックエンド API レスポンスタイム

```bash
# ポートフォリオ取得（最も頻繁に呼ばれるエンドポイント）
curl -o /dev/null -s -w "%{time_total}s\n" http://localhost:8080/api/portfolio/latest

# スナップショット一覧（履歴が増えた場合の確認）
curl -o /dev/null -s -w "%{time_total}s\n" http://localhost:8080/api/snapshots
```

**目安**: 各エンドポイントが 1秒以内に応答すること

### フロントエンドビルドサイズ確認

```bash
cd frontend
npm run build

# dist/ のサイズを確認
du -sh dist/
```

**目安**: `dist/` の合計が 5MB 以内であること（Chart.js 含む）

---

## 判断基準

| 指標 | 目標値 | 理由 |
|---|---|---|
| API レスポンスタイム | < 1s | シングルユーザー・SQLiteのため |
| フロントエンドビルドサイズ | < 5MB | Chart.js 等のライブラリ込み |
| ページ初期表示 | < 3s | ローカル環境での利用を想定 |
