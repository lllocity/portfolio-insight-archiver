import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HoldingsTable from '../HoldingsTable.vue'
import type { EnrichedHolding, SectorAllocation } from '@/types/portfolio'

vi.mock('@/api/memoApi', () => ({
  upsertMemo: vi.fn(),
  deleteMemo: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

function holding(ticker: string, valuation: string, profitLoss: string): EnrichedHolding {
  return {
    tickerCode: ticker,
    companyName: `${ticker}テスト`,
    sectorName: '電気機器',
    totalQuantity: '100',
    weightedAvgPurchasePrice: '2500',
    currentPrice: '2800',
    dailyChange: '50',
    dailyChangePct: '1.82',
    totalProfitLoss: profitLoss,
    totalProfitLossPct: '10.00',
    totalValuation: valuation,
    memo: null,
    estimatedAnnualDividend: null,
    dividendMonths: null,
  }
}

const sectors: SectorAllocation[] = []

describe('HoldingsTable', () => {
  it('全銘柄行を表示する', () => {
    const holdings = [
      holding('7203', '280000', '30000'),
      holding('6758', '2700000', '300000')
    ]
    const wrapper = mount(HoldingsTable, { props: { holdings, sectors } })
    expect(wrapper.findAll('[data-testid="holdings-row"]')).toHaveLength(2)
  })

  it('デフォルトは評価額降順でソートされる', () => {
    const holdings = [
      holding('7203', '280000', '30000'),
      holding('6758', '2700000', '300000')
    ]
    const wrapper = mount(HoldingsTable, { props: { holdings, sectors } })
    const rows = wrapper.findAll('[data-testid="holdings-row"]')
    expect(rows[0].text()).toContain('6758')
    expect(rows[1].text()).toContain('7203')
  })

  it('estimatedAnnualDividendがnullの場合は「-」を表示する', () => {
    const wrapper = mount(HoldingsTable, {
      props: { holdings: [holding('7203', '280000', '30000')], sectors }
    })
    expect(wrapper.find('[data-testid="holdings-row"]').text()).toContain('-')
  })
})
