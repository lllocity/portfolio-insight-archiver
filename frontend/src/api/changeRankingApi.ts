import { supabase } from '@/lib/supabase'

export interface DailyChange {
  snapshotDate: string
  /** 騰落幅（円）＝ Σ(前日比 × 数量)（株式のみ） */
  changeAmount: number
  /** 騰落率（％）＝ 騰落幅 ÷ 前日評価額 × 100 */
  changePct: number
}

export async function fetchDailyChangeRanking(): Promise<DailyChange[]> {
  const { data, error } = await supabase.functions.invoke('daily-change-ranking')
  if (error) throw new Error('騰落率ランキングの取得に失敗しました')
  return data ?? []
}
