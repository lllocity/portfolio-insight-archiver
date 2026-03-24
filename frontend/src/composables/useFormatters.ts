const jpy = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })

export function useFormatters() {
  /** "5000000" → "¥5,000,000" */
  function formatCurrency(value: string | null | undefined): string {
    if (value == null || value === '') return '―'
    const num = parseFloat(value)
    if (isNaN(num)) return '―'
    return jpy.format(num).replace(/￥/g, '¥')
  }

  /** "6.38" → "+6.38%"  / "-1.20" → "-1.20%" */
  function formatPct(value: string | null | undefined): string {
    if (value == null || value === '') return '―'
    const num = parseFloat(value)
    if (isNaN(num)) return '―'
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(2)}%`
  }

  /** 数値が正なら "text-green-600"、負なら "text-red-600"、ゼロは "" */
  function colorClass(value: string | null | undefined): string {
    if (value == null || value === '') return ''
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    if (num > 0) return 'text-green-600'
    if (num < 0) return 'text-red-600'
    return ''
  }

  /** null/undefined/空文字 → "―" */
  function nullish(value: string | null | undefined): string {
    return value != null && value !== '' ? value : '―'
  }

  return { formatCurrency, formatPct, colorClass, nullish }
}
