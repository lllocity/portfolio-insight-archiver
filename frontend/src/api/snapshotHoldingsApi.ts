import { supabase } from '@/lib/supabase'

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
  const { data, error } = await supabase.functions.invoke('snapshot-holdings', {
    body: { date },
  })
  if (error) throw error
  return data ?? []
}
