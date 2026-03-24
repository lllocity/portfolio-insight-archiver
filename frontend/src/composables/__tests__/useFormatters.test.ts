import { describe, it, expect } from 'vitest'
import { useFormatters } from '../useFormatters'

describe('useFormatters', () => {
  const { formatCurrency, formatPct, colorClass, nullish } = useFormatters()

  describe('formatCurrency', () => {
    it('正常な数値を円フォーマットに変換する', () => {
      expect(formatCurrency('5000000')).toBe('¥5,000,000')
    })
    it('nullの場合は「―」を返す', () => {
      expect(formatCurrency(null)).toBe('―')
    })
    it('空文字の場合は「―」を返す', () => {
      expect(formatCurrency('')).toBe('―')
    })
    it('負の数値も正しくフォーマットする', () => {
      expect(formatCurrency('-300000')).toBe('-¥300,000')
    })
  })

  describe('formatPct', () => {
    it('正の数値にはプラス符号を付与する', () => {
      expect(formatPct('6.38')).toBe('+6.38%')
    })
    it('負の数値はマイナス符号のみ', () => {
      expect(formatPct('-1.20')).toBe('-1.20%')
    })
    it('ゼロは「+0.00%」', () => {
      expect(formatPct('0')).toBe('+0.00%')
    })
    it('nullの場合は「―」', () => {
      expect(formatPct(null)).toBe('―')
    })
  })

  describe('colorClass', () => {
    it('正の数値は text-green-600', () => {
      expect(colorClass('300')).toBe('text-green-600')
    })
    it('負の数値は text-red-600', () => {
      expect(colorClass('-100')).toBe('text-red-600')
    })
    it('ゼロは空文字', () => {
      expect(colorClass('0')).toBe('')
    })
    it('nullは空文字', () => {
      expect(colorClass(null)).toBe('')
    })
  })

  describe('nullish', () => {
    it('値がある場合はそのまま返す', () => {
      expect(nullish('2.5')).toBe('2.5')
    })
    it('nullは「―」', () => {
      expect(nullish(null)).toBe('―')
    })
    it('undefinedは「―」', () => {
      expect(nullish(undefined)).toBe('―')
    })
    it('空文字は「―」', () => {
      expect(nullish('')).toBe('―')
    })
  })
})
