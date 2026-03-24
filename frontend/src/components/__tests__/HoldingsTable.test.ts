import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HoldingsTable from '../HoldingsTable.vue'
import type { EnrichedHolding } from '@/types/portfolio'

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
    dividendYield: '2.5',
    pbr: null,
    per: null
  }
}

describe('HoldingsTable', () => {
  it('全銘柄行を表示する', () => {
    const holdings = [
      holding('7203', '280000', '30000'),
      holding('6758', '2700000', '300000')
    ]
    const wrapper = mount(HoldingsTable, { props: { holdings } })
    expect(wrapper.findAll('[data-testid="holdings-row"]')).toHaveLength(2)
  })

  it('デフォルトは評価額降順でソートされる', () => {
    const holdings = [
      holding('7203', '280000', '30000'),
      holding('6758', '2700000', '300000')
    ]
    const wrapper = mount(HoldingsTable, { props: { holdings } })
    const rows = wrapper.findAll('[data-testid="holdings-row"]')
    expect(rows[0].text()).toContain('6758')
    expect(rows[1].text()).toContain('7203')
  })

  it('PBRがnullの場合は「―」を表示する', () => {
    const wrapper = mount(HoldingsTable, {
      props: { holdings: [holding('7203', '280000', '30000')] }
    })
    expect(wrapper.find('[data-testid="holdings-row"]').text()).toContain('―')
  })
})
