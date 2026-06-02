export interface HoldingRecord {
  tickerCode: string
  totalQuantity: number
  weightedAvgPurchasePrice: number
  currentPrice: number
  dailyChange: number
  dailyChangePct: number
  totalProfitLoss: number
  totalProfitLossPct: number
  totalValuation: number
}

const COL_TICKER = '銘柄（コード）'
const COL_PURCHASE_PRICE = '取得単価'
const COL_REFERENCE_PRICE = '参考単価'
const COL_CREDIT_PRICE = '建単価'
const COL_FUND_NAME = 'ファンド名'

type SectionType = 'STOCK' | 'FUND' | 'UNKNOWN'

interface RawRow {
  quantity: string
  purchasePrice: string
  currentPrice: string
  dailyChange: string
  dailyChangePct: string
  profitLoss: string
  valuation: string
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let inQuotes = false
  let current = ''
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function extractTickerCode(raw: string): string | null {
  if (!raw) return null
  const spaceIdx = raw.indexOf(' ')
  const code = spaceIdx > 0 ? raw.slice(0, spaceIdx) : raw
  return /^\d{3}[0-9A-Z]$/.test(code) ? code : null
}

function resolvePriceColumn(headers: string[]): string | null {
  if (headers.includes(COL_PURCHASE_PRICE)) return COL_PURCHASE_PRICE
  if (headers.includes(COL_REFERENCE_PRICE)) return COL_REFERENCE_PRICE
  if (headers.includes(COL_CREDIT_PRICE)) return COL_CREDIT_PRICE
  return null
}

function parseNumber(raw: string): number {
  if (!raw || raw === '-' || raw === '--') return 0
  const cleaned = raw.replace(/,/g, '').replace(/%/g, '').replace(/\+/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function mapRow(headers: string[], fields: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  const len = Math.min(headers.length, fields.length)
  for (let i = 0; i < len; i++) result[headers[i]] = fields[i]
  return result
}

function aggregateTicker(tickerCode: string, rows: RawRow[]): HoldingRecord {
  let totalQuantity = 0
  let totalCost = 0
  let totalValuation = 0
  let totalProfitLoss = 0

  const first = rows[0]
  const currentPrice = parseNumber(first.currentPrice)
  const dailyChange = parseNumber(first.dailyChange)
  const dailyChangePct = parseNumber(first.dailyChangePct)

  for (const row of rows) {
    const qty = parseNumber(row.quantity)
    const purchasePrice = parseNumber(row.purchasePrice)
    totalQuantity += qty
    totalCost += qty * purchasePrice
    totalValuation += parseNumber(row.valuation)
    totalProfitLoss += parseNumber(row.profitLoss)
  }

  const weightedAvg = totalQuantity === 0 ? 0 : totalCost / totalQuantity
  const costBasis = totalValuation - totalProfitLoss
  const totalProfitLossPct = costBasis === 0 ? 0 : parseFloat((totalProfitLoss / costBasis * 100).toFixed(2))

  return {
    tickerCode,
    totalQuantity: parseFloat(totalQuantity.toFixed(4)),
    weightedAvgPurchasePrice: parseFloat(weightedAvg.toFixed(4)),
    currentPrice,
    dailyChange,
    dailyChangePct,
    totalProfitLoss,
    totalProfitLossPct,
    totalValuation,
  }
}

export function parseCsv(text: string): HoldingRecord[] {
  const lines = text.split(/\r?\n/)
  const grouped = new Map<string, RawRow[]>()
  let currentHeaders: string[] = []
  let priceColumn: string | null = null
  let sectionType: SectionType = 'UNKNOWN'

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const fields = parseCsvLine(trimmed)
    if (fields.length === 0) continue
    const firstField = fields[0]

    if (firstField === COL_FUND_NAME) {
      currentHeaders = fields
      priceColumn = resolvePriceColumn(fields)
      sectionType = 'FUND'
      continue
    }
    if (firstField === COL_TICKER) {
      currentHeaders = fields
      priceColumn = resolvePriceColumn(fields)
      sectionType = priceColumn ? 'STOCK' : 'UNKNOWN'
      continue
    }
    if (sectionType === 'UNKNOWN' || !currentHeaders.length) continue

    if (sectionType === 'STOCK') {
      const tickerCode = extractTickerCode(firstField)
      if (!tickerCode || !priceColumn) continue
      const rowMap = mapRow(currentHeaders, fields)
      const priceStr = rowMap[priceColumn]
      if (!priceStr) continue
      const rows = grouped.get(tickerCode) ?? []
      rows.push({
        quantity: rowMap['数量'] ?? '0',
        purchasePrice: priceStr,
        currentPrice: rowMap['現在値'] ?? '0',
        dailyChange: rowMap['前日比'] ?? '0',
        dailyChangePct: rowMap['前日比（％）'] ?? '0',
        profitLoss: rowMap['損益'] ?? '0',
        valuation: rowMap['評価額'] ?? '0',
      })
      grouped.set(tickerCode, rows)
    } else if (sectionType === 'FUND') {
      if (fields.length < 10 || !firstField || /^\d/.test(firstField) || !priceColumn) continue
      const rowMap = mapRow(currentHeaders, fields)
      const priceStr = rowMap[priceColumn]
      if (!priceStr) continue
      const rows = grouped.get(firstField) ?? []
      rows.push({
        quantity: rowMap['数量'] ?? '0',
        purchasePrice: priceStr,
        currentPrice: rowMap['現在値'] ?? '0',
        dailyChange: rowMap['前日比'] ?? '0',
        dailyChangePct: rowMap['前日比（％）'] ?? '0',
        profitLoss: rowMap['損益'] ?? '0',
        valuation: rowMap['評価額'] ?? '0',
      })
      grouped.set(firstField, rows)
    }
  }

  if (grouped.size === 0) throw new Error('No valid stock holding data found in CSV file.')
  return Array.from(grouped.entries()).map(([code, rows]) => aggregateTicker(code, rows))
}
