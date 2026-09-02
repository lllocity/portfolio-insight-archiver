import { describe, it, expect } from 'vitest'
import { sortRanking } from '../changeRanking'
import type { DailyChange } from '@/api/changeRankingApi'

const rows: DailyChange[] = [
  { snapshotDate: '2026-01-05', changeAmount: 100, changePct: 1.0 },
  { snapshotDate: '2026-01-06', changeAmount: -300, changePct: -2.0 },
  { snapshotDate: '2026-01-07', changeAmount: 200, changePct: 0.5 },
]

describe('sortRanking', () => {
  it('騰落率 降順（上昇が上位）', () => {
    const r = sortRanking(rows, 'pct', 'desc')
    expect(r.map((x) => x.snapshotDate)).toEqual(['2026-01-05', '2026-01-07', '2026-01-06'])
  })

  it('騰落率 昇順（下落が上位）', () => {
    const r = sortRanking(rows, 'pct', 'asc')
    expect(r.map((x) => x.snapshotDate)).toEqual(['2026-01-06', '2026-01-07', '2026-01-05'])
  })

  it('騰落幅 降順は率と順位が異なりうる', () => {
    const r = sortRanking(rows, 'amount', 'desc')
    // 額では 200(01-07) > 100(01-05) > -300(01-06)
    expect(r.map((x) => x.snapshotDate)).toEqual(['2026-01-07', '2026-01-05', '2026-01-06'])
  })

  it('元配列を破壊しない', () => {
    const snapshot = rows.map((r) => r.snapshotDate)
    sortRanking(rows, 'pct', 'desc')
    expect(rows.map((r) => r.snapshotDate)).toEqual(snapshot)
  })

  it('同値は日付降順で安定', () => {
    const tie: DailyChange[] = [
      { snapshotDate: '2026-02-01', changeAmount: 50, changePct: 1.0 },
      { snapshotDate: '2026-02-03', changeAmount: 50, changePct: 1.0 },
      { snapshotDate: '2026-02-02', changeAmount: 50, changePct: 1.0 },
    ]
    const r = sortRanking(tie, 'pct', 'desc')
    expect(r.map((x) => x.snapshotDate)).toEqual(['2026-02-03', '2026-02-02', '2026-02-01'])
  })

  it('空配列は空配列を返す', () => {
    expect(sortRanking([], 'pct', 'desc')).toEqual([])
  })
})
