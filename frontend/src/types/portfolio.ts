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
  memo: string | null
  estimatedAnnualDividend: string | null
  dividendMonths: string | null
}

export interface SectorAllocation {
  sector33Name: string
  totalValuation: string
  allocationPct: string
  holdingCount: number
}

export interface TickerSummary {
  tickerCode: string
  companyName: string | null
  totalQuantity: string
}

export interface SnapshotDiff {
  addedTickers: TickerSummary[]
  removedTickers: TickerSummary[]
}

export interface SnapshotListItem {
  snapshotDate: string
  totalValuation: string
  totalProfitLoss: string
  totalProfitLossPct: string
  holdingCount: number
}

export interface PortfolioResponse {
  snapshot: SnapshotSummary
  holdings: EnrichedHolding[]
  sectors: SectorAllocation[]
}
