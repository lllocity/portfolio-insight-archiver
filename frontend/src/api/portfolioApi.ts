import { supabase } from '@/lib/supabase'
import { fetchAll } from '@/lib/fetchAll'
import type { PortfolioResponse, SnapshotListItem, SectorAllocation, SnapshotDiff } from '@/types/portfolio'

export async function fetchLatestPortfolio(): Promise<PortfolioResponse | null> {
  const { data, error } = await supabase.functions.invoke('portfolio-latest')
  if (error) throw new Error('ポートフォリオの取得に失敗しました')
  return data ?? null
}

export async function fetchSnapshotDates(): Promise<SnapshotListItem[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  // snapshot_date はユーザー内で一意（UNIQUE(user_id, snapshot_date)）なので並び順も一意
  const data = await fetchAll(() =>
    supabase
      .from('snapshots')
      .select('snapshot_date, total_valuation, cash_balance, total_profit_loss, total_profit_loss_pct, holding_count')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false }),
  ).catch((e) => {
    console.error('履歴の取得に失敗しました:', e)
    throw new Error('履歴の取得に失敗しました', { cause: e })
  })
  return data.map((s) => ({
    snapshotDate: s.snapshot_date,
    totalValuation: String(s.total_valuation),
    cashBalance: String(s.cash_balance ?? 0),
    totalProfitLoss: String(s.total_profit_loss),
    totalProfitLossPct: String(s.total_profit_loss_pct),
    holdingCount: s.holding_count,
  }))
}

export async function fetchSnapshotSectors(date: string): Promise<SectorAllocation[]> {
  const { data, error } = await supabase.functions.invoke('snapshot-sectors', {
    body: { date },
  })
  if (error) throw new Error('セクター情報の取得に失敗しました')
  return data ?? []
}

export async function fetchSnapshotDiff(from: string, to: string): Promise<SnapshotDiff> {
  const { data, error } = await supabase.functions.invoke('snapshot-diff', {
    body: { from, to },
  })
  if (error) throw new Error('差分の取得に失敗しました')
  return data
}
