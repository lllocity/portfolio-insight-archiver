# Unit Test Execution

## バックエンド ユニットテスト（JUnit 5 + Mockito）

### 全テスト実行

```bash
cd backend
./gradlew test
```

### 特定クラスのみ実行

```bash
# SnapshotQueryControllerTest のみ実行
./gradlew test --tests "com.portfolio.snapshot.SnapshotQueryControllerTest"

# Snapshot 関連テスト全体
./gradlew test --tests "com.portfolio.snapshot.*"
```

### 期待されるテスト結果

| テストクラス | テストケース数 | 対象 |
|---|---|---|
| `SnapshotQueryControllerTest` | 4 | GET /api/snapshots, GET /api/snapshots/diff |
| `SnapshotServiceTest` | 3 | スナップショット保存ロジック |
| `CsvParserServiceTest` | 13 | CSV解析 |
| `PortfolioAnalysisServiceTest` | 8 | ポートフォリオ分析 |
| `AiPromptGeneratorServiceTest` | 4 | AIプロンプト生成 |
| `CsvPathValidatorTest` | 6 | パスバリデーション |
| **合計** | **38** | |

**期待される出力**:
```
BUILD SUCCESSFUL in Xs
```

**テストレポートの場所**: `backend/build/reports/tests/test/index.html`

---

## フロントエンド ユニットテスト（Vitest + @vue/test-utils）

### 全テスト実行

```bash
cd frontend
npm run test
```

### ウォッチモードで実行（開発中）

```bash
npm run test -- --watch
```

### カバレッジレポート付き実行

```bash
npm run test -- --coverage
```

### 期待されるテスト結果

| テストファイル | テストケース数 | 対象 |
|---|---|---|
| `composables/__tests__/useFormatters.test.ts` | 12 | formatCurrency・formatPct・colorClass・nullish |
| `composables/__tests__/useClipboard.test.ts` | 2 | copy() |
| `components/__tests__/SummaryCard.test.ts` | - | SummaryCard コンポーネント |
| `components/__tests__/DiffView.test.ts` | - | DiffView コンポーネント |
| `components/__tests__/HoldingsTable.test.ts` | - | HoldingsTable ソート機能 |

**期待される出力**:
```
✓ src/composables/__tests__/useFormatters.test.ts (12)
✓ src/composables/__tests__/useClipboard.test.ts (2)
✓ src/components/__tests__/SummaryCard.test.ts
✓ src/components/__tests__/DiffView.test.ts
✓ src/components/__tests__/HoldingsTable.test.ts

Test Files  5 passed (5)
Tests       XX passed (XX)
```

**テストレポートの場所**: `frontend/coverage/`（カバレッジ実行時）

---

## テスト失敗時の対応

1. エラーメッセージを確認し、対象テストクラス・ケースを特定
2. 対象コードを修正
3. 再実行して全テストがパスすることを確認
