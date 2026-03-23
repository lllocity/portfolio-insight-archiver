# ドメインエンティティ — frontend ユニット

バックエンドAPIレスポンスに対応する TypeScript インターフェース定義。
すべての数値フィールドは `string` 型（バックエンドが `BigDecimal.toPlainString()` で返すため）。

---

## portfolio.ts

```typescript
// GET /api/portfolio/latest のレスポンス

export interface SnapshotSummary {
  snapshotDate: string;          // "2026-03-24"
  totalValuation: string;        // "5000000"
  totalProfitLoss: string;       // "300000"
  totalProfitLossPct: string;    // "6.38"
  holdingCount: number;
}

export interface EnrichedHolding {
  tickerCode: string;            // "7203" or "日本成長株ファンド"
  companyName: string | null;
  sectorName: string;            // "輸送用機器" / "投資信託" / "不明"
  totalQuantity: string;
  weightedAvgPurchasePrice: string;
  currentPrice: string;
  dailyChange: string;           // 正負あり: "50" or "-273"
  dailyChangePct: string;        // "1.82" or "-1.20"
  totalProfitLoss: string;       // 正負あり
  totalProfitLossPct: string;
  totalValuation: string;
  dividendYield: string | null;  // null = J-Quants未取得 or 無料プラン制限
  pbr: string | null;
  per: string | null;
}

export interface SectorAllocation {
  sector33Name: string;
  totalValuation: string;
  allocationPct: string;         // "70.00" (0-100)
  holdingCount: number;
}

export interface HoldingChange {
  tickerCode: string;
  quantityDiff: string;          // 正負あり
  valuationDiff: string;         // 正負あり
}

export interface SnapshotDiff {
  addedTickers: string[];
  removedTickers: string[];
  changed: HoldingChange[];
  valuationChange: string;       // 正負あり
  profitLossChange: string;      // 正負あり
}

export interface PortfolioResponse {
  snapshot: SnapshotSummary;
  holdings: EnrichedHolding[];
  sectors: SectorAllocation[];
  diff: SnapshotDiff;
}
```

---

## snapshot.ts

```typescript
// GET /api/snapshots のレスポンス（新規追加エンドポイント）

export interface SnapshotListItem {
  snapshotDate: string;
  totalValuation: string;
  totalProfitLoss: string;
  totalProfitLossPct: string;
  holdingCount: number;
}

// GET /api/snapshots/diff?from={date}&to={date} のレスポンス（新規追加エンドポイント）
// SnapshotDiff と同一型（portfolio.ts の SnapshotDiff を再利用）
export type { SnapshotDiff } from './portfolio';
```

---

## prompt.ts

```typescript
// GET /api/prompt/latest のレスポンス（新規追加エンドポイント）

export interface PromptResponse {
  prompt: string;  // マークダウン形式のプロンプトテキスト
}
```

---

## import.ts

```typescript
// POST /api/csv/import のリクエスト・レスポンス

export interface CsvImportRequest {
  filePath: string;
}

export interface ImportResult {
  success: boolean;
  snapshotDate: string;
  importedCount: number;
  docUrl: string | null;
  warnings: string[] | null;
}
```

---

## settings.ts

```typescript
// GET /api/settings, PUT /api/settings のレスポンス

export interface Settings {
  csvDefaultPath: string | null;
  googleDriveFolderId: string | null;
}
```

---

## エラーレスポンス

```typescript
// バックエンドの ApiErrorResponse（GlobalExceptionHandler から返却）

export interface ApiError {
  status: number;
  error: string;
  message: string;
  path: string;
}
```
