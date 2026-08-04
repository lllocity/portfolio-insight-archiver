// 実現損益CSV（SBI: DOMESTIC_STOCK_*.csv）パーサ
// SBI が計算済みの実現損益(税引前)をそのまま保持する。
// 成行の分割約定は約定単位で複数行になるため、まとめず1行ずつ保持する。
import { parseCsvLine, parseNumber } from './csv-parser.ts'
import { extractTickerFromName, normalizeDate, resolveHeader, type ParseResult } from './sbi-parse-utils.ts'

export interface RealizedRecord {
  tradeDate: string // YYYY-MM-DD（約定日）
  account: string // 特定 / 一般 / NISA（成長投資枠）等
  tickerCode: string
  companyName: string | null
  quantity: number
  proceeds: number // 売却/決済額
  avgCost: number | null // 平均取得価額
  realizedPl: number // 実現損益(税引前・円)
}

// 明細行の読み取りに必要な列（列順・余剰列に依存せず列名で解決する）
const REQUIRED = [
  '約定日', '口座', '銘柄名', '数量', '売却/決済額', '平均取得価額', '実現損益(税引前・円)',
]

export function parseRealizedCsv(text: string): ParseResult<RealizedRecord> {
  const lines = text.split(/\r?\n/)
  const records: RealizedRecord[] = []
  let skipped = 0
  let col: Record<string, number> | null = null // 明細ヘッダ検出後の列マップ
  let headerLen = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const fields = parseCsvLine(trimmed)

    if (!col) {
      // ヘッダ検出前（プリアンブル・集計ブロック）は無視。全required列が揃う行を明細ヘッダとみなす。
      const resolved = resolveHeader(fields, REQUIRED)
      if (resolved) { col = resolved; headerLen = fields.length }
      continue
    }

    // 明細行。列不足の行はスキップ（受容リスク: 明細後にフッター等が付く形式なら誤読の余地）
    if (fields.length < headerLen) { skipped++; continue }
    const tradeDate = normalizeDate(fields[col['約定日']])
    if (!tradeDate) { skipped++; continue }

    // 現物売却レポートは全行が売却のため取引区分は検証しない（受容リスク）。
    // 非売却行を含むCSVを取り込むと誤合算し得る点は現状フォーマットでは発生しない。
    const { tickerCode, companyName } = extractTickerFromName(fields[col['銘柄名']])
    const avgCostStr = fields[col['平均取得価額']]
    records.push({
      tradeDate,
      account: fields[col['口座']],
      tickerCode,
      companyName,
      quantity: parseNumber(fields[col['数量']]),
      proceeds: Math.round(parseNumber(fields[col['売却/決済額']])),
      avgCost: avgCostStr ? parseNumber(avgCostStr) : null,
      realizedPl: Math.round(parseNumber(fields[col['実現損益(税引前・円)']])), // 0や負値も有効
    })
  }

  return { records, skipped }
}
