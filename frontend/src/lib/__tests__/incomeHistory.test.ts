import { describe, it, expect } from 'vitest'
import {
  availableYears,
  displayName,
  dividendsOfYear,
  groupDividendsByTicker,
  groupRealizedByTicker,
  mergeExecutions,
  realizedOfYear,
  sortRows,
  summarizeYear,
} from '../incomeHistory'
import type { DividendRow, RealizedPnlRow } from '@/types/totalReturn'

function realized(p: Partial<RealizedPnlRow>): RealizedPnlRow {
  return {
    tradeDate: '2026-03-10',
    account: '特定',
    tickerCode: '7203',
    companyName: 'トヨタ自動車',
    quantity: 100,
    proceeds: 300000,
    avgCost: 2500,
    realizedPl: 50000,
    ...p,
  }
}

function dividend(p: Partial<DividendRow>): DividendRow {
  return {
    payDate: '2026-06-20',
    account: '特定/一般',
    product: '国内株式(現物)',
    tickerCode: '8058',
    companyName: '三菱商事',
    quantity: 100,
    amountNet: 5000,
    ...p,
  }
}

describe('availableYears', () => {
  it('データのある年と当年を重複なく降順で返す', () => {
    const years = availableYears(
      [realized({ tradeDate: '2025-12-30' }), realized({ tradeDate: '2026-01-05' })],
      [dividend({ payDate: '2024-06-20' })],
      2026,
    )
    expect(years).toEqual([2026, 2025, 2024])
  })

  it('データが無くても当年は含む', () => {
    expect(availableYears([], [], 2026)).toEqual([2026])
  })
})

describe('realizedOfYear / dividendsOfYear', () => {
  it('暦年で絞り込む（年末年始の境界）', () => {
    const rows = [realized({ tradeDate: '2025-12-31' }), realized({ tradeDate: '2026-01-01' })]
    expect(realizedOfYear(rows, 2026).map((r) => r.tradeDate)).toEqual(['2026-01-01'])
    const divs = [dividend({ payDate: '2025-12-31' }), dividend({ payDate: '2026-01-01' })]
    expect(dividendsOfYear(divs, 2025).map((d) => d.payDate)).toEqual(['2025-12-31'])
  })
})

describe('mergeExecutions', () => {
  it('同一 約定日・銘柄・口座の分割約定を1取引にまとめ、平均取得単価を数量加重する', () => {
    const trades = mergeExecutions([
      realized({ quantity: 100, proceeds: 300000, avgCost: 2500, realizedPl: 50000 }),
      realized({ quantity: 300, proceeds: 900000, avgCost: 2700, realizedPl: 90000 }),
    ])
    expect(trades).toHaveLength(1)
    expect(trades[0]).toMatchObject({
      quantity: 400,
      proceeds: 1200000,
      realizedPl: 140000,
      executions: 2,
    })
    // (2500*100 + 2700*300) / 400 = 2650
    expect(trades[0].avgCost).toBe(2650)
  })

  it('日付・銘柄・口座のいずれかが違えば別取引', () => {
    const trades = mergeExecutions([
      realized({}),
      realized({ tradeDate: '2026-03-11' }),
      realized({ tickerCode: '6758' }),
      realized({ account: 'NISA（成長投資枠）' }),
    ])
    expect(trades).toHaveLength(4)
    expect(trades.every((t) => t.executions === 1)).toBe(true)
  })

  it('平均取得価額が無い約定は加重平均から除外し、全て無ければ null', () => {
    const partial = mergeExecutions([
      realized({ quantity: 100, avgCost: 2000 }),
      realized({ quantity: 100, avgCost: null }),
    ])
    expect(partial[0].avgCost).toBe(2000)
    const none = mergeExecutions([realized({ avgCost: null })])
    expect(none[0].avgCost).toBeNull()
  })
})

describe('groupRealizedByTicker', () => {
  it('銘柄ごとに取引回数・数量・売却額・実現損益を合計する', () => {
    const trades = mergeExecutions([
      realized({ tradeDate: '2026-03-10', realizedPl: 50000 }),
      realized({ tradeDate: '2026-03-10', realizedPl: 10000 }), // 分割約定 → 1取引
      realized({ tradeDate: '2026-04-01', realizedPl: -20000 }),
      realized({ tickerCode: '6758', companyName: 'ソニーG', realizedPl: 5000 }),
    ])
    const groups = groupRealizedByTicker(trades)
    const toyota = groups.find((g) => g.tickerCode === '7203')!
    expect(toyota).toMatchObject({ trades: 2, quantity: 300, realizedPl: 40000 })
    expect(groups.find((g) => g.tickerCode === '6758')!.trades).toBe(1)
  })
})

describe('groupDividendsByTicker', () => {
  it('銘柄ごとに受取回数・受取額を合計する', () => {
    const groups = groupDividendsByTicker([
      dividend({ payDate: '2026-06-20', amountNet: 5000 }),
      dividend({ payDate: '2026-12-05', amountNet: 6000 }),
      dividend({ tickerCode: 'eMAXIS Slim 全世界株式', companyName: null, product: '投資信託', amountNet: 100 }),
    ])
    expect(groups.find((g) => g.tickerCode === '8058')).toMatchObject({ payments: 2, amountNet: 11000 })
    expect(groups.find((g) => g.tickerCode === 'eMAXIS Slim 全世界株式')).toMatchObject({ payments: 1, amountNet: 100 })
  })
})

describe('summarizeYear', () => {
  it('合計・利益/損失件数（まとめた後）・配当の銘柄数/回数・確定合計を返す', () => {
    const trades = mergeExecutions([
      realized({ realizedPl: 30000 }),
      realized({ realizedPl: 20000 }), // 分割約定 → 1取引（利益）
      realized({ tradeDate: '2026-04-01', realizedPl: -10000 }),
    ])
    const s = summarizeYear(trades, [
      dividend({ amountNet: 5000 }),
      dividend({ amountNet: 6000 }),
      dividend({ tickerCode: '9432', amountNet: 1000 }),
    ])
    expect(s).toEqual({
      realizedTotal: 40000,
      gainCount: 1,
      lossCount: 1,
      dividendTotal: 12000,
      dividendTickers: 2,
      dividendPayments: 3,
      confirmedTotal: 52000,
    })
  })
})

describe('sortRows', () => {
  const rows = [
    { name: 'b', v: 2, n: 1 as number | null },
    { name: 'a', v: 3, n: null },
    { name: 'c', v: 1, n: 5 },
  ]

  it('数値を昇順・降順で並べ、元配列は変更しない', () => {
    expect(sortRows(rows, 'v', 'desc').map((r) => r.v)).toEqual([3, 2, 1])
    expect(sortRows(rows, 'v', 'asc').map((r) => r.v)).toEqual([1, 2, 3])
    expect(rows.map((r) => r.v)).toEqual([2, 3, 1])
  })

  it('文字列を並べる', () => {
    expect(sortRows(rows, 'name', 'asc').map((r) => r.name)).toEqual(['a', 'b', 'c'])
  })

  it('null は方向に関わらず末尾', () => {
    expect(sortRows(rows, 'n', 'desc').map((r) => r.n)).toEqual([5, 1, null])
    expect(sortRows(rows, 'n', 'asc').map((r) => r.n)).toEqual([1, 5, null])
  })
})

describe('displayName', () => {
  it('株式はコード＋名前、投資信託はファンド名のみ', () => {
    expect(displayName('7203', 'トヨタ自動車')).toBe('7203 トヨタ自動車')
    expect(displayName('eMAXIS Slim 全世界株式', null)).toBe('eMAXIS Slim 全世界株式')
  })
})
