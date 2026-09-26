import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import IncomePage from '../IncomePage.vue'
import type { DividendRow, RealizedPnlRow } from '@/types/totalReturn'

vi.mock('@/stores/totalReturnStore', () => ({
  useTotalReturnStore: vi.fn(),
}))

const realized: RealizedPnlRow[] = [
  // 2026: 7203 は同日分割約定（2行 → 1取引）、6758 は損失
  { tradeDate: '2026-03-10', account: '特定', tickerCode: '7203', companyName: 'トヨタ自動車', quantity: 100, proceeds: 300000, avgCost: 2500, realizedPl: 50000 },
  { tradeDate: '2026-03-10', account: '特定', tickerCode: '7203', companyName: 'トヨタ自動車', quantity: 100, proceeds: 300000, avgCost: 2500, realizedPl: 50000 },
  { tradeDate: '2026-05-01', account: '特定', tickerCode: '6758', companyName: 'ソニーG', quantity: 10, proceeds: 30000, avgCost: 4000, realizedPl: -10000 },
  // 2025
  { tradeDate: '2025-11-20', account: '特定', tickerCode: '8058', companyName: '三菱商事', quantity: 100, proceeds: 280000, avgCost: 2000, realizedPl: 80000 },
]

const dividends: DividendRow[] = [
  { payDate: '2026-06-20', account: '特定/一般', product: '国内株式(現物)', tickerCode: '8058', companyName: '三菱商事', quantity: 100, amountNet: 5000 },
  { payDate: '2026-03-15', account: 'NISA（つみたて投資枠）', product: '投資信託', tickerCode: 'eMAXIS Slim 全世界株式', companyName: null, quantity: 10000, amountNet: 300 },
]

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/income', component: IncomePage }],
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(IncomePage, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-26T10:00:00+09:00'))
  const { useTotalReturnStore } = await import('@/stores/totalReturnStore')
  vi.mocked(useTotalReturnStore).mockReturnValue({
    realized, dividends, loading: false, loaded: true, error: null,
  } as never)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('IncomePage', () => {
  it('既定は当年。年の選択肢はデータのある年＋当年（降順）', async () => {
    const { wrapper } = await mountAt('/income')
    const buttons = wrapper.findAll('[data-testid="year-selector"] button')
    expect(buttons.map((b) => b.text())).toEqual(['2026', '2025'])
    expect(buttons[0].classes()).toContain('bg-blue-50')
  })

  it('当年のサマリ: 分割約定はまとめて件数を数える', async () => {
    const { wrapper } = await mountAt('/income')
    const cards = wrapper.findAll('[data-testid="summary-card"]')
    expect(cards[0].text()).toContain('¥90,000')
    expect(cards[0].text()).toContain('利益 1件／損失 1件')
    expect(cards[1].text()).toContain('¥5,300')
    expect(cards[1].text()).toContain('2銘柄・2回')
    expect(cards[2].text()).toContain('¥95,300')
  })

  it('銘柄別は実現損益の大きい順', async () => {
    const { wrapper } = await mountAt('/income')
    const rows = wrapper.findAll('[data-testid="realized-ticker-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('7203 トヨタ自動車')
    expect(rows[1].text()).toContain('6758 ソニーG')
  })

  it('明細に切り替えると分割約定を1行にまとめて件数を表示する', async () => {
    const { wrapper } = await mountAt('/income')
    await wrapper.find('[data-testid="view-detail"]').trigger('click')
    const rows = wrapper.findAll('[data-testid="realized-detail-row"]')
    expect(rows).toHaveLength(2)
    // 約定日の新しい順
    expect(rows[0].text()).toContain('2026-05-01')
    expect(rows[1].text()).toContain('(2約定)')
  })

  it('?year= で指定年を表示する', async () => {
    const { wrapper } = await mountAt('/income?year=2025')
    expect(wrapper.find('[data-testid="year-2025"]').classes()).toContain('bg-blue-50')
    expect(wrapper.findAll('[data-testid="realized-ticker-row"]')[0].text()).toContain('8058 三菱商事')
  })

  it('範囲外の ?year= は当年にフォールバックする', async () => {
    const { wrapper } = await mountAt('/income?year=1999')
    expect(wrapper.find('[data-testid="year-2026"]').classes()).toContain('bg-blue-50')
  })

  it('年ボタンで URL の year が変わる', async () => {
    const { wrapper, router } = await mountAt('/income')
    await wrapper.find('[data-testid="year-2025"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.year).toBe('2025')
  })

  it('受取配当タブ: 投資信託はファンド名で表示し、データの無い年は空表示', async () => {
    const { wrapper } = await mountAt('/income')
    await wrapper.find('[data-testid="section-dividend"]').trigger('click')
    const rows = wrapper.findAll('[data-testid="dividend-ticker-row"]')
    expect(rows[0].text()).toContain('8058 三菱商事')
    expect(rows[1].text()).toContain('eMAXIS Slim 全世界株式')

    const past = await mountAt('/income?year=2025')
    await past.wrapper.find('[data-testid="section-dividend"]').trigger('click')
    expect(past.wrapper.find('[data-testid="dividend-empty"]').exists()).toBe(true)
  })

  it('並び替え: ヘッダクリックで昇降が切り替わる', async () => {
    const { wrapper } = await mountAt('/income')
    await wrapper.find('[data-testid="sort-realizedPl"]').trigger('click') // desc → asc
    const rows = wrapper.findAll('[data-testid="realized-ticker-row"]')
    expect(rows[0].text()).toContain('6758')
    expect(wrapper.find('[data-testid="sort-realizedPl"]').text()).toContain('▲')
  })

  it('取得エラー時はエラーを表示する', async () => {
    const { useTotalReturnStore } = await import('@/stores/totalReturnStore')
    vi.mocked(useTotalReturnStore).mockReturnValue({
      realized: [], dividends: [], loading: false, loaded: false, error: '実現損益の取得に失敗しました',
    } as never)
    const { wrapper } = await mountAt('/income')
    expect(wrapper.find('[data-testid="income-error"]').text()).toContain('実現損益の取得に失敗しました')
  })
})
