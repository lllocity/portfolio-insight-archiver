import { supabase } from '@/lib/supabase'
import type { PortfolioResponse, SnapshotListItem, SectorAllocation, SnapshotDiff } from '@/types/portfolio'

export async function fetchLatestPortfolio(): Promise<PortfolioResponse | null> {
  const { data, error } = await supabase.functions.invoke('portfolio-latest')
  if (error) throw error
  return data ?? null
}

export async function fetchSnapshotDates(): Promise<SnapshotListItem[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data, error } = await supabase
    .from('snapshots')
    .select('snapshot_date, total_valuation, total_profit_loss, total_profit_loss_pct, holding_count')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: false })
  if (error) throw error
  return (data ?? []).map((s) => ({
    snapshotDate: s.snapshot_date,
    totalValuation: String(s.total_valuation),
    totalProfitLoss: String(s.total_profit_loss),
    totalProfitLossPct: String(s.total_profit_loss_pct),
    holdingCount: s.holding_count,
  }))
}

export async function fetchSnapshotSectors(date: string): Promise<SectorAllocation[]> {
  const { data, error } = await supabase.functions.invoke('snapshot-sectors', {
    body: { date },
  })
  if (error) throw error
  return data ?? []
}

export async function fetchSnapshotDiff(from: string, to: string): Promise<SnapshotDiff> {
  const { data, error } = await supabase.functions.invoke('snapshot-diff', {
    body: { from, to },
  })
  if (error) throw error
  return data
}
