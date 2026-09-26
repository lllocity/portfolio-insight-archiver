import { describe, it, expect, vi, beforeEach } from 'vitest'

// supabase のクエリビルダを模したモック。呼ばれたメソッドと引数を記録し、
// range() ごとに pages を順に返す。
const mock = vi.hoisted(() => {
  const state = {
    calls: [] as { method: string; args: unknown[] }[],
    pages: [] as unknown[][],
    error: null as { message: string } | null,
  }
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order']) {
    builder[m] = (...args: unknown[]) => {
      state.calls.push({ method: m, args })
      return builder
    }
  }
  builder.range = async (from: number, to: number) => {
    state.calls.push({ method: 'range', args: [from, to] })
    if (state.error) return { data: null, error: state.error }
    return { data: state.pages.shift() ?? [], error: null }
  }
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (table: string) => {
      state.calls.push({ method: 'from', args: [table] })
      return builder
    },
  }
  return { state, supabase }
})

vi.mock('@/lib/supabase', () => ({ supabase: mock.supabase }))

import { fetchRealizedPnl, fetchDividends } from '../totalReturnApi'
import { fetchSnapshotDates } from '../portfolioApi'

const callsOf = (method: string) => mock.state.calls.filter((c) => c.method === method).map((c) => c.args)

beforeEach(() => {
  mock.state.calls = []
  mock.state.pages = []
  mock.state.error = null
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('fetchRealizedPnl', () => {
  it('約定日降順＋id降順の一意な並びでページング取得し、全ページを結合する', async () => {
    const row = { trade_date: '2026-01-05', account: '特定', ticker_code: '7203', company_name: 'トヨタ', quantity: '100', proceeds: '300000', avg_cost: null, realized_pl: '5000' }
    mock.state.pages = [Array(1000).fill(row), [row]]

    const rows = await fetchRealizedPnl()

    expect(rows).toHaveLength(1001)
    expect(rows[0]).toMatchObject({ tradeDate: '2026-01-05', realizedPl: 5000, avgCost: null })
    expect(callsOf('from')[0]).toEqual(['realized_pnl'])
    expect(callsOf('eq')[0]).toEqual(['user_id', 'u1'])
    expect(callsOf('order').slice(0, 2)).toEqual([
      ['trade_date', { ascending: false }],
      ['id', { ascending: false }],
    ])
    // 1000 + 1 + 空ページ
    expect(callsOf('range')).toEqual([[0, 999], [1000, 1999], [1001, 2000]])
  })

  it('失敗時は利用者向けメッセージで投げ、原因を cause に保持する', async () => {
    mock.state.error = { message: 'statement timeout' }
    const err = await fetchRealizedPnl().catch((e: Error) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toBe('実現損益の取得に失敗しました')
    expect(((err as Error).cause as Error).message).toBe('statement timeout')
  })
})

describe('fetchDividends', () => {
  it('受渡日降順＋id降順の一意な並びでページング取得する', async () => {
    mock.state.pages = [[{ pay_date: '2026-06-20', account: 'NISA', product: '国内株式(現物)', ticker_code: '8058', company_name: '三菱商事', quantity: '100', amount_net: '5000' }]]

    const rows = await fetchDividends()

    expect(rows).toEqual([{ payDate: '2026-06-20', account: 'NISA', product: '国内株式(現物)', tickerCode: '8058', companyName: '三菱商事', quantity: 100, amountNet: 5000 }])
    expect(callsOf('from')[0]).toEqual(['dividends'])
    expect(callsOf('order').slice(0, 2)).toEqual([
      ['pay_date', { ascending: false }],
      ['id', { ascending: false }],
    ])
    expect(callsOf('range')[0]).toEqual([0, 999])
  })
})

describe('fetchSnapshotDates', () => {
  it('スナップショット日降順でページング取得する', async () => {
    mock.state.pages = [[{ snapshot_date: '2026-09-25', total_valuation: 100, cash_balance: null, total_profit_loss: 10, total_profit_loss_pct: 1, holding_count: 3 }]]

    const rows = await fetchSnapshotDates()

    expect(rows).toEqual([{ snapshotDate: '2026-09-25', totalValuation: '100', cashBalance: '0', totalProfitLoss: '10', totalProfitLossPct: '1', holdingCount: 3 }])
    expect(callsOf('from')[0]).toEqual(['snapshots'])
    expect(callsOf('order')[0]).toEqual(['snapshot_date', { ascending: false }])
    expect(callsOf('range')[0]).toEqual([0, 999])
  })

  it('失敗時は利用者向けメッセージで投げる', async () => {
    mock.state.error = { message: 'boom' }
    await expect(fetchSnapshotDates()).rejects.toThrow('履歴の取得に失敗しました')
  })
})
