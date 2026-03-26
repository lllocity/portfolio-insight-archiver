export interface SnapshotHolding {
  tickerCode: string
  companyName: string | null
  sector33Name: string | null
  totalQuantity: string
  weightedAvgPurchasePrice: string
  currentPrice: string
  dailyChange: string
  dailyChangePct: string
  totalProfitLoss: string
  totalProfitLossPct: string
  totalValuation: string
}

export async function fetchSnapshotHoldings(date: string): Promise<SnapshotHolding[]> {
  const res = await fetch(`/api/snapshots/${date}/holdings`)
  if (!res.ok) throw new Error('holdings fetch failed')
  return res.json()
}
