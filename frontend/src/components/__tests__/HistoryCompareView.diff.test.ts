import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import HistoryCompareView from '../HistoryCompareView.vue'
import type { SnapshotDiff, SnapshotListItem, SectorAllocation } from '@/types/portfolio'

vi.mock('@/api/portfolioApi', () => ({
  fetchSnapshotDates: vi.fn(),
  fetchSnapshotSectors: vi.fn(),
  fetchSnapshotDiff: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}))

import { fetchSnapshotDates, fetchSnapshotSectors, fetchSnapshotDiff } from '@/api/portfolioApi'

const dates: SnapshotListItem[] = [
  { snapshotDate: '2026-06-05', totalValuation: '0', cashBalance: '0', totalProfitLoss: '0', totalProfitLossPct: '0', holdingCount: 1 },
  { snapshotDate: '2026-06-04', totalValuation: '0', cashBalance: '0', totalProfitLoss: '0', totalProfitLossPct: '0', holdingCount: 1 },
]
const emptySectors: SectorAllocation[] = []

beforeEach(() => {
  vi.mocked(fetchSnapshotDates).mockResolvedValue(dates)
  vi.mocked(fetchSnapshotSectors).mockResolvedValue(emptySectors)
})

describe('HistoryCompareView — diff 表示', () => {
  it('changedTickers に株数増加がある場合「買い足し」と表示される', async () => {
    const diff: SnapshotDiff = {
      addedTickers: [],
      removedTickers: [],
      changedTickers: [
        { tickerCode: '6723', companyName: 'ルネサスエレクトロニクス', fromQuantity: '100', toQuantity: '200', quantityDiff: 100 },
      ],
    }
    vi.mocked(fetchSnapshotDiff).mockResolvedValue(diff)

    const wrapper = mount(HistoryCompareView)
    await flushPromises()

    expect(wrapper.text()).toContain('買い足し')
    expect(wrapper.text()).toContain('ルネサスエレクトロニクス')
    expect(wrapper.text()).toContain('+100株')
    expect(wrapper.text()).not.toContain('この期間に売買なし')
  })

  it('changedTickers に株数減少がある場合「一部売却」と表示される', async () => {
    const diff: SnapshotDiff = {
      addedTickers: [],
      removedTickers: [],
      changedTickers: [
        { tickerCode: '6723', companyName: 'ルネサスエレクトロニクス', fromQuantity: '200', toQuantity: '100', quantityDiff: -100 },
      ],
    }
    vi.mocked(fetchSnapshotDiff).mockResolvedValue(diff)

    const wrapper = mount(HistoryCompareView)
    await flushPromises()

    expect(wrapper.text()).toContain('一部売却')
    expect(wrapper.text()).not.toContain('この期間に売買なし')
  })

  it('すべての差分が空の場合「売買なし」と表示される', async () => {
    const diff: SnapshotDiff = {
      addedTickers: [],
      removedTickers: [],
      changedTickers: [],
    }
    vi.mocked(fetchSnapshotDiff).mockResolvedValue(diff)

    const wrapper = mount(HistoryCompareView)
    await flushPromises()

    expect(wrapper.text()).toContain('この期間に売買なし')
  })

  it('addedTickers のみある場合「新規購入」と表示される', async () => {
    const diff: SnapshotDiff = {
      addedTickers: [{ tickerCode: '7203', companyName: 'トヨタ自動車', totalQuantity: '100' }],
      removedTickers: [],
      changedTickers: [],
    }
    vi.mocked(fetchSnapshotDiff).mockResolvedValue(diff)

    const wrapper = mount(HistoryCompareView)
    await flushPromises()

    expect(wrapper.text()).toContain('新規購入')
    expect(wrapper.text()).not.toContain('この期間に売買なし')
  })
})
