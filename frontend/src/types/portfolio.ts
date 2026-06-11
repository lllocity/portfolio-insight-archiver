// portfolio-latest / snapshot-* Edge Functions のレスポンス型

export interface SnapshotSummary {
  snapshotDate: string
  totalValuation: string
  cashBalance: string
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
  totalProfitLoss: string
  totalProfitLossPct: string
}

export interface TickerSummary {
  tickerCode: string
  companyName: string | null
  totalQuantity: string
}

export interface ChangedTickerSummary {
  tickerCode: string
  companyName: string | null
  fromQuantity: string
  toQuantity: string
  quantityDiff: number
}

export interface SnapshotDiff {
  addedTickers: TickerSummary[]
  removedTickers: TickerSummary[]
  changedTickers: ChangedTickerSummary[]
}

export interface SnapshotListItem {
  snapshotDate: string
  totalValuation: string
  cashBalance: string
  totalProfitLoss: string
  totalProfitLossPct: string
  holdingCount: number
}

export interface PortfolioResponse {
  snapshot: SnapshotSummary
  holdings: EnrichedHolding[]
  sectors: SectorAllocation[]
}
