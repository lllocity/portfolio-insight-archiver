// SBI CSV（実現損益・配当）パーサ共通ユーティリティ
// 保有証券CSV（csv-parser.ts）とは列構成・コード位置が異なるため専用。

export interface ParseResult<T> {
  records: T[]
  skipped: number // 不正・対象外（USD建て・0円等）でスキップした行数
}

/**
 * "2026/6/29" → "2026-06-29"。形式不正なら null。
 */
export function normalizeDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const [, y, mo, d] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/**
 * 銘柄名からコードを抽出する。実現損益・配当CSVは「会社名 コード」形式で
 * 末尾（半角スペース区切りの最終トークン）にコードが付く。
 * 例: "ブックオフグループホールディングス 9278" → { tickerCode:"9278", companyName:"ブックオフ…" }
 *     "アストロスケールホールディングス 186A"     → { tickerCode:"186A", ... }
 * 投資信託はコードが無いためファンド名全体を tickerCode とし companyName は null。
 * （会社名内の全角スペースはそのまま保持する）
 */
export function extractTickerFromName(
  raw: string,
): { tickerCode: string; companyName: string | null } {
  const trimmed = raw.trim()
  const lastSpace = trimmed.lastIndexOf(' ')
  if (lastSpace > 0) {
    const maybeCode = trimmed.slice(lastSpace + 1).trim()
    if (/^\d{3}[0-9A-Z]$/.test(maybeCode)) {
      return { tickerCode: maybeCode, companyName: trimmed.slice(0, lastSpace).trim() }
    }
  }
  return { tickerCode: trimmed, companyName: null }
}

/**
 * 明細ヘッダ行を列名で解決し、列名→indexのマップを返す。
 * required の全列が存在すれば明細ヘッダとみなす（USD列等の余剰列は許容）。
 * プリアンブル（例: "受渡日","2026/4/1-..." の2列）は required を満たさず null。
 * 列順・列数の変化に依存せず、固定indexより堅牢。
 */
export function resolveHeader(
  fields: string[],
  required: string[],
): Record<string, number> | null {
  const map: Record<string, number> = {}
  for (const name of required) {
    const idx = fields.indexOf(name)
    if (idx === -1) return null
    map[name] = idx
  }
  return map
}
