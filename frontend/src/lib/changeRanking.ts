// 日次騰落率ランキングの並び替え（純関数・テスト可能）
import type { DailyChange } from '@/api/changeRankingApi'

export type SortKey = 'pct' | 'amount'
export type SortDir = 'desc' | 'asc'

/**
 * 騰落率(pct)／騰落幅(amount) でランキングを並び替える。
 * 元配列は変更せず、新しい配列を返す。
 */
export function sortRanking(rows: DailyChange[], key: SortKey, dir: SortDir): DailyChange[] {
  const field = key === 'pct' ? 'changePct' : 'changeAmount'
  const sign = dir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const diff = a[field] - b[field]
    if (diff !== 0) return sign * diff
    // 同値は日付降順で安定させる
    return a.snapshotDate < b.snapshotDate ? 1 : a.snapshotDate > b.snapshotDate ? -1 : 0
  })
}
