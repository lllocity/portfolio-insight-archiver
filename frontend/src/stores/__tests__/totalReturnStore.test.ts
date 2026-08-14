import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockFetchRealized = vi.fn()
const mockFetchDividends = vi.fn()
vi.mock('@/api/totalReturnApi', () => ({
  fetchRealizedPnl: () => mockFetchRealized(),
  fetchDividends: () => mockFetchDividends(),
}))

import { useTotalReturnStore } from '../totalReturnStore'
import type { DividendRow, RealizedPnlRow } from '@/types/totalReturn'

const realized = (tradeDate: string, realizedPl: number): RealizedPnlRow => ({
  tradeDate, account: '特定', tickerCode: '0000', companyName: null,
  quantity: 100, proceeds: 0, avgCost: null, realizedPl,
})
const dividend = (payDate: string, amountNet: number): DividendRow => ({
  payDate, account: '特定', product: '国内株式(現物)', tickerCode: '0000',
  companyName: null, quantity: 100, amountNet,
})

describe('totalReturnStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetchRealized.mockReset()
    mockFetchDividends.mockReset()
  })

  it('load 後に lifetime 合計を算出する', async () => {
    mockFetchRealized.mockResolvedValue([realized('2026-07-30', 159510), realized('2025-12-04', 54000)])
    mockFetchDividends.mockResolvedValue([dividend('2026-06-29', 9500)])
    const store = useTotalReturnStore()
    await store.load()

    expect(store.loaded).toBe(true)
    expect(store.lifetime.realizedTotal).toBe(213510)
    expect(store.lifetime.dividendTotal).toBe(9500)
    expect(store.lifetime.coverageRange).toEqual({ from: '2025-12-04', to: '2026-07-30' })
  })

  it('取得失敗時は error をセットする', async () => {
    mockFetchRealized.mockRejectedValue(new Error('実現損益の取得に失敗しました'))
    mockFetchDividends.mockResolvedValue([])
    const store = useTotalReturnStore()
    await store.load()

    expect(store.error).toBe('実現損益の取得に失敗しました')
    expect(store.loaded).toBe(false)
  })
})
