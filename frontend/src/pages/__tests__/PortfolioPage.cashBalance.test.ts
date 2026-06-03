import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PortfolioPage from '../PortfolioPage.vue'
import type { PortfolioResponse } from '@/types/portfolio'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }),
  },
}))

vi.mock('@/stores/portfolioStore', () => ({
  usePortfolioStore: vi.fn(),
}))

function makePortfolioData(totalValuation: string, cashBalance: string, annualDividend: string | null): PortfolioResponse {
  return {
    snapshot: {
      snapshotDate: '2026-06-03',
      totalValuation,
      cashBalance,
      totalProfitLoss: '100000',
      totalProfitLossPct: '5.00',
      holdingCount: 2,
    },
    holdings: [
      {
        tickerCode: '7203',
        companyName: 'トヨタ',
        sectorName: '輸送用機器',
        totalQuantity: '100',
        weightedAvgPurchasePrice: '2500',
        currentPrice: '2800',
        dailyChange: '50',
        dailyChangePct: '1.82',
        totalProfitLoss: '30000',
        totalProfitLossPct: '12.00',
        totalValuation,
        memo: null,
        estimatedAnnualDividend: annualDividend,
        dividendMonths: annualDividend ? '3,9' : null,
      },
    ],
    sectors: [],
  }
}

describe('PortfolioPage - cashBalance', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('総資産 = 株式評価額 + 待機資金を表示する', async () => {
    const { usePortfolioStore } = await import('@/stores/portfolioStore')
    vi.mocked(usePortfolioStore).mockReturnValue({
      data: makePortfolioData('2000000', '500000', null),
      loading: false,
      error: null,
      load: vi.fn(),
      reload: vi.fn(),
    } as never)

    const wrapper = mount(PortfolioPage, { global: { stubs: { CsvImportForm: true, SectorChart: true, HoldingsTable: true } } })
    const cards = wrapper.findAll('[data-testid="summary-card"]')
    // 総資産カードが先頭
    expect(cards[0].text()).toContain('¥2,500,000')
  })

  it('待機資金ゼロのとき総資産 = 株式評価額', async () => {
    const { usePortfolioStore } = await import('@/stores/portfolioStore')
    vi.mocked(usePortfolioStore).mockReturnValue({
      data: makePortfolioData('3000000', '0', null),
      loading: false,
      error: null,
      load: vi.fn(),
      reload: vi.fn(),
    } as never)

    const wrapper = mount(PortfolioPage, { global: { stubs: { CsvImportForm: true, SectorChart: true, HoldingsTable: true } } })
    const cards = wrapper.findAll('[data-testid="summary-card"]')
    expect(cards[0].text()).toContain('¥3,000,000')
  })

  it('配当利回りは総資産（株式+現金）を分母にする', async () => {
    const { usePortfolioStore } = await import('@/stores/portfolioStore')
    // 株式 2,000,000 + 現金 2,000,000 = 総資産 4,000,000
    // 年間配当 100,000 → 利回り 2.50%
    vi.mocked(usePortfolioStore).mockReturnValue({
      data: makePortfolioData('2000000', '2000000', '100000'),
      loading: false,
      error: null,
      load: vi.fn(),
      reload: vi.fn(),
    } as never)

    const wrapper = mount(PortfolioPage, { global: { stubs: { CsvImportForm: true, SectorChart: true, HoldingsTable: true } } })
    expect(wrapper.text()).toContain('2.50%')
  })
})
