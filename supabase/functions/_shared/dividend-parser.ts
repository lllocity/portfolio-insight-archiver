// 配当金・分配金CSV（SBI: DISTRIBUTION_*.csv）パーサ
// 金額は「受取額(税引後・円)」のみ（SBIは税引前を出力しない）。
// 投資信託も含む（コードなし＝ファンド名を tickerCode に使用）。
// USD建て等で円額が空/0の行は skip し件数のみ集計する（現状スキーマは円のみ）。
import { parseCsvLine, parseNumber } from './csv-parser.ts'
import { extractTickerFromName, normalizeDate, resolveHeader, type ParseResult } from './sbi-parse-utils.ts'

export interface DividendRecord {
  payDate: string // YYYY-MM-DD（受渡日）
  account: string
  product: string | null // 国内株式(現物) / 投資信託
  tickerCode: string
  companyName: string | null
  quantity: number | null
  amountNet: number // 受取額(税引後・円)
}

// 明細行の読み取りに必要な列（列順・余剰列(USD列等)に依存せず列名で解決する）
const REQUIRED = ['受渡日', '口座', '商品', '銘柄名', '数量', '受取額(税引後・円)']

export function parseDividendCsv(text: string): ParseResult<DividendRecord> {
  const lines = text.split(/\r?\n/)
  const records: DividendRecord[] = []
  let skipped = 0
  let col: Record<string, number> | null = null
  let headerLen = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const fields = parseCsvLine(trimmed)

    if (!col) {
      const resolved = resolveHeader(fields, REQUIRED)
      if (resolved) { col = resolved; headerLen = fields.length }
      continue
    }

    // 明細行
    if (fields.length < headerLen) { skipped++; continue }
    const payDate = normalizeDate(fields[col['受渡日']])
    if (!payDate) { skipped++; continue }

    const amountNet = Math.round(parseNumber(fields[col['受取額(税引後・円)']]))
    if (amountNet <= 0) { skipped++; continue } // USD建て・0円行はスキップ

    // 投資信託はコードを持たないためファンド名をそのまま tickerCode にする。
    // （株式のように末尾トークンをコード誤認しないよう商品種別で分岐）
    const product = fields[col['商品']] || null
    const rawName = fields[col['銘柄名']]
    let tickerCode: string
    let companyName: string | null
    if (product === '投資信託') {
      tickerCode = rawName.trim()
      companyName = null
    } else {
      ({ tickerCode, companyName } = extractTickerFromName(rawName))
    }

    const quantityStr = fields[col['数量']]
    records.push({
      payDate,
      account: fields[col['口座']],
      product,
      tickerCode,
      companyName,
      quantity: quantityStr ? parseNumber(quantityStr) : null,
      amountNet,
    })
  }

  return { records, skipped }
}
