# Build and Test Summary

## ビルド状況

| ユニット | ビルドツール | 成果物 | 状況 |
|---|---|---|---|
| backend | Gradle 8.10.2 + Java 21 | `backend/build/libs/portfolio-*.jar` | ✅ SUCCESS |
| frontend | Vite 5 + Node.js 20 | `frontend/dist/` (303KB JS / 11KB CSS) | ✅ SUCCESS |
| Docker | Docker Compose V2 | コンテナイメージ | 手動実行要 |

---

## テスト実行サマリー

### ユニットテスト

| 対象 | ツール | テストケース | 状況 |
|---|---|---|---|
| backend | JUnit 5 + Mockito | 39件（SnapshotQueryControllerTest 4件含む） | ✅ 39/39 PASSED |
| frontend | Vitest | 27件（useFormatters 16件、useClipboard 2件、コンポーネント 9件） | ✅ 27/27 PASSED |

**修正内容**（テスト実行時に発覚・修正済み）:
- `useFormatters.ts`: jsdom 環境の `Intl.NumberFormat` が全角 `￥` を返すため `¥` に置換
- `useFormatters.ts`: `formatPct` でゼロに `+` を付与するよう `num >= 0` に修正
- `useClipboard.test.ts`: jsdom で `vi.spyOn(document, 'execCommand')` が動作しないため直接代入に変更

### 統合テスト

| シナリオ | 状況 |
|---|---|
| CSVインポート → ポートフォリオ表示 | 手動実行要 |
| 履歴一覧 → 差分比較 | 手動実行要 |
| AIプロンプト生成・コピー | 手動実行要 |
| 設定保存・CsvImportForm への反映 | 手動実行要 |

### パフォーマンステスト

シングルユーザー個人ツールのため大規模負荷テストは N/A。基本レスポンスタイム（< 1s）の確認のみ推奨。

### セキュリティ・E2Eテスト

N/A（個人ローカル利用ツール・シングルユーザー）

---

## ビルドコマンドクイックリファレンス

```bash
# バックエンドビルド＆テスト
cd backend && ./mvnw clean package

# フロントエンドビルド＆テスト
cd frontend && npm install && npm run test && npm run build

# Docker フルスタック起動
docker compose up --build
```

---

## 次のステップ

1. 上記コマンドを実行してビルドとテストが成功することを確認
2. 統合テストシナリオを `http://localhost:5173` で手動確認
3. 問題がなければ Operations Phase（デプロイ計画）へ進む
