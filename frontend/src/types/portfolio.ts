// GET /api/portfolio/latest のレスポンス型
// バックエンドの PortfolioResponse に対応

export interface SnapshotSummary {
  snapshotDate: string
  totalValuation: string
  totalProfitLoss: string
  totalProfitLossPct: string
  holdingCount: number
}

export interface EnrichedHolding {
  tickerCode: string
  companyName: string | null
  sectorName: string
  totalQuantity: string
  weightedAvgPurchasePrice: string
  currentPrice: string
  dailyChange: string
  dailyChangePct: string
  totalProfitLoss: string
  totalProfitLossPct: string
  totalValuation: string
  dividendYield: string | null
  pbr: string | null
  per: string | null
}

export interface SectorAllocation {
  sector33Name: string
  totalValuation: string
  allocationPct: string
  holdingCount: number
}

export interface HoldingChange {
  tickerCode: string
  quantityDiff: string
  valuationDiff: string
}

export interface SnapshotDiff {
  addedTickers: string[]
  removedTickers: string[]
  changed: HoldingChange[]
  valuationChange: string
  profitLossChange: string
}

export interface PortfolioResponse {
  snapshot: SnapshotSummary
  holdings: EnrichedHolding[]
  sectors: SectorAllocation[]
  diff: SnapshotDiff
}
