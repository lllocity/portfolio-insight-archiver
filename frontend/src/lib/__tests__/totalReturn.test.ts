import { describe, it, expect } from 'vitest'
import { annualReturn, cumulativeBreakdownByDate, lifetimeTotals, yearlySummary } from '../totalReturn'
import type { DividendRow, RealizedPnlRow } from '@/types/totalReturn'

const realized = (tradeDate: string, realizedPl: number): RealizedPnlRow => ({
  tradeDate, account: '特定', tickerCode: '0000', companyName: null,
  quantity: 100, proceeds: 0, avgCost: null, realizedPl,
})
const dividend = (payDate: string, amountNet: number): DividendRow => ({
  payDate, account: '特定', product: '国内株式(現物)', tickerCode: '0000',
  companyName: null, quantity: 100, amountNet,
})

describe('lifetimeTotals', () => {
  it('実現損益・配当を合算し集計期間を求める', () => {
    const r = [realized('2026-07-30', 159510), realized('2025-12-04', 54000)]
    const d = [dividend('2026-06-29', 9500), dividend('2026-06-16', 10565)]
    const res = lifetimeTotals(r, d)
    expect(res.realizedTotal).toBe(213510)
    expect(res.dividendTotal).toBe(20065)
    // realized と dividend 双方の日付を跨いだ最小〜最大
    expect(res.coverageRange).toEqual({ from: '2025-12-04', to: '2026-07-30' })
  })

  it('負の実現損益も正しく合算する', () => {
    const res = lifetimeTotals([realized('2026-06-17', -87690), realized('2026-06-10', 267000)], [])
    expect(res.realizedTotal).toBe(179310)
  })

  it('空データなら 0 と null', () => {
    const res = lifetimeTotals([], [])
    expect(res).toEqual({ realizedTotal: 0, dividendTotal: 0, coverageRange: null })
  })
})

describe('yearlySummary', () => {
  it('暦年ごとにバケットし降順で返す', () => {
    const r = [realized('2026-07-30', 100), realized('2025-05-29', 200), realized('2024-01-10', 50)]
    const d = [dividend('2026-06-29', 30), dividend('2025-06-16', 40)]
    const rows = yearlySummary(r, d, 2026)
    expect(rows.map((x) => x.year)).toEqual([2026, 2025, 2024])
    const y2026 = rows.find((x) => x.year === 2026)!
    expect(y2026).toMatchObject({ realizedTotal: 100, dividendTotal: 30, confirmedTotal: 130, isCurrentYear: true })
    const y2025 = rows.find((x) => x.year === 2025)!
    expect(y2025).toMatchObject({ realizedTotal: 200, dividendTotal: 40, confirmedTotal: 240, isCurrentYear: false })
  })

  it('暦年の境界（12/31 と 1/1）で年が分かれる', () => {
    const r = [realized('2025-12-31', 999), realized('2026-01-01', 111)]
    const rows = yearlySummary(r, [], 2026)
    expect(rows.find((x) => x.year === 2025)?.realizedTotal).toBe(999)
    expect(rows.find((x) => x.year === 2026)?.realizedTotal).toBe(111)
  })

  it('当年はデータが無くても必ずYTD行を含める', () => {
    const rows = yearlySummary([realized('2024-03-01', 500)], [], 2026)
    const current = rows.find((x) => x.year === 2026)
    expect(current).toMatchObject({ year: 2026, realizedTotal: 0, dividendTotal: 0, confirmedTotal: 0, isCurrentYear: true })
    // 降順の先頭が当年
    expect(rows[0].year).toBe(2026)
  })

  it('当年のみ現在含みを totalReturn に足す。過去年は含みなし', () => {
    const r = [realized('2026-05-29', 100), realized('2025-05-29', 200)]
    const rows = yearlySummary(r, [], 2026, 900)
    const y2026 = rows.find((x) => x.year === 2026)!
    expect(y2026).toMatchObject({ confirmedTotal: 100, unrealized: 900, totalReturn: 1000 })
    const y2025 = rows.find((x) => x.year === 2025)!
    expect(y2025).toMatchObject({ confirmedTotal: 200, unrealized: 0, totalReturn: 200 })
  })
})

describe('annualReturn', () => {
  it('当年の実現＋配当＋現在含みを合算する', () => {
    const r = [realized('2026-05-29', 200_000), realized('2025-12-04', 999_999)]
    const d = [dividend('2026-06-29', 30_000), dividend('2025-06-16', 888_888)]
    const res = annualReturn(r, d, 2026, 1_500_000)
    expect(res).toEqual({
      year: 2026,
      unrealized: 1_500_000,
      realizedTotal: 200_000, // 2025分は除外
      dividendTotal: 30_000, // 2025分は除外
      total: 1_730_000,
    })
  })

  it('当年データが無くても現在含みは反映する', () => {
    const res = annualReturn([], [], 2026, 500_000)
    expect(res).toMatchObject({ realizedTotal: 0, dividendTotal: 0, total: 500_000 })
  })
})

describe('cumulativeBreakdownByDate', () => {
  it('各スナップショット時点の 含み／実現累計／配当累計 と合計を返す', () => {
    const snaps = [
      { snapshotDate: '2026-04-30', unrealized: 1_000_000 },
      { snapshotDate: '2026-06-30', unrealized: 1_500_000 },
    ]
    const r = [realized('2026-05-29', 200_000), realized('2026-06-17', -80_000)]
    const d = [dividend('2026-06-29', 30_000)]
    const res = cumulativeBreakdownByDate(snaps, r, d)

    // 4/30時点: 実現・配当はまだ無い → 含みのみ
    expect(res[0]).toEqual({ date: '2026-04-30', unrealized: 1_000_000, realizedCum: 0, dividendCum: 0, total: 1_000_000 })
    // 6/30時点: 含み150万 + 実現(20万-8万=12万) + 配当3万
    expect(res[1]).toEqual({ date: '2026-06-30', unrealized: 1_500_000, realizedCum: 120_000, dividendCum: 30_000, total: 1_650_000 })
  })

  it('約定日・受渡日がスナップショット日と同日なら含める（≤）', () => {
    const res = cumulativeBreakdownByDate([{ snapshotDate: '2026-05-29', unrealized: 0 }], [realized('2026-05-29', 100)], [dividend('2026-05-29', 50)])
    expect(res[0]).toMatchObject({ realizedCum: 100, dividendCum: 50, total: 150 })
  })

  it('スナップショットの順序を保持する', () => {
    const snaps = [{ snapshotDate: '2026-06-30', unrealized: 2 }, { snapshotDate: '2026-04-30', unrealized: 1 }]
    const res = cumulativeBreakdownByDate(snaps, [], [])
    expect(res.map((x) => x.date)).toEqual(['2026-06-30', '2026-04-30'])
  })
})
