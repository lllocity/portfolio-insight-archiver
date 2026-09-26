import { describe, it, expect } from 'vitest'
import { isStockCode } from '../assetType'

describe('isStockCode', () => {
  it('4桁の証券コードは株式', () => {
    expect(isStockCode('7203')).toBe(true)
    expect(isStockCode('1306')).toBe(true)
  })

  it('英字入りの新コードも株式', () => {
    expect(isStockCode('130A')).toBe(true)
  })

  it('ファンド名（投資信託）は株式ではない', () => {
    expect(isStockCode('日経平均高配当利回り株ファンド')).toBe(false)
    expect(isStockCode('eMAXIS Slim 全世界株式(オール・カントリー)')).toBe(false)
  })

  it('桁数違い・小文字は株式ではない', () => {
    expect(isStockCode('720')).toBe(false)
    expect(isStockCode('72030')).toBe(false)
    expect(isStockCode('130a')).toBe(false)
  })
})
