// 実現損益・配当タブ（年別）の集計（純関数・テスト可能）
// データは totalReturnStore が全件ロード済みの明細を使い、年での絞り込み・分割約定のまとめ・
// 銘柄別集計をここで行う（BE への追加リクエストは発生しない）。
import { yearOf } from '@/lib/totalReturn'
import type { DividendRow, RealizedPnlRow } from '@/types/totalReturn'

/** 分割約定をまとめた1取引（同一 約定日・銘柄・口座） */
export interface RealizedTrade {
  tradeDate: string
  account: string
  tickerCode: string
  companyName: string | null
  quantity: number
  proceeds: number
  avgCost: number | null // 数量加重平均。平均取得価額を持つ約定が無ければ null
  realizedPl: number
  executions: number // まとめた約定の件数
}

export interface RealizedByTicker {
  tickerCode: string
  companyName: string | null
  trades: number // まとめた後の取引回数
  quantity: number
  proceeds: number
  realizedPl: number
}

export interface DividendByTicker {
  tickerCode: string
  companyName: string | null
  payments: number
  amountNet: number
}

export interface IncomeYearSummary {
  realizedTotal: number
  gainCount: number // 実現損益 ≥ 0 の取引数（まとめた後）
  lossCount: number // 実現損益 < 0 の取引数（まとめた後）
  dividendTotal: number
  dividendTickers: number
  dividendPayments: number
  confirmedTotal: number // realizedTotal + dividendTotal
}

/** データのある年＋当年を降順で返す（年の選択肢） */
export function availableYears(
  realized: RealizedPnlRow[],
  dividends: DividendRow[],
  currentYear: number,
): number[] {
  const years = new Set<number>([currentYear])
  for (const r of realized) years.add(yearOf(r.tradeDate))
  for (const d of dividends) years.add(yearOf(d.payDate))
  return [...years].sort((a, b) => b - a)
}

export function realizedOfYear(rows: RealizedPnlRow[], year: number): RealizedPnlRow[] {
  return rows.filter((r) => yearOf(r.tradeDate) === year)
}

export function dividendsOfYear(rows: DividendRow[], year: number): DividendRow[] {
  return rows.filter((d) => yearOf(d.payDate) === year)
}

/**
 * 同一 約定日・銘柄・口座 の約定（成行の分割約定など）を1取引にまとめる。
 * 平均取得単価は、平均取得価額を持つ約定の数量で加重平均する。
 * 順序は入力で最初に現れた順を保つ。
 */
export function mergeExecutions(rows: RealizedPnlRow[]): RealizedTrade[] {
  const map = new Map<string, RealizedTrade & { costQty: number; costSum: number }>()
  for (const r of rows) {
    const key = `${r.tradeDate}\u0000${r.tickerCode}\u0000${r.account}`
    let t = map.get(key)
    if (!t) {
      t = {
        tradeDate: r.tradeDate,
        account: r.account,
        tickerCode: r.tickerCode,
        companyName: r.companyName,
        quantity: 0,
        proceeds: 0,
        avgCost: null,
        realizedPl: 0,
        executions: 0,
        costQty: 0,
        costSum: 0,
      }
      map.set(key, t)
    }
    t.quantity += r.quantity
    t.proceeds += r.proceeds
    t.realizedPl += r.realizedPl
    t.executions += 1
    t.companyName ??= r.companyName
    if (r.avgCost != null) {
      t.costQty += r.quantity
      t.costSum += r.avgCost * r.quantity
    }
  }
  return [...map.values()].map(({ costQty, costSum, ...t }) => ({
    ...t,
    avgCost: costQty > 0 ? costSum / costQty : null,
  }))
}

export function groupRealizedByTicker(trades: RealizedTrade[]): RealizedByTicker[] {
  const map = new Map<string, RealizedByTicker>()
  for (const t of trades) {
    const g = map.get(t.tickerCode) ?? {
      tickerCode: t.tickerCode,
      companyName: t.companyName,
      trades: 0,
      quantity: 0,
      proceeds: 0,
      realizedPl: 0,
    }
    g.trades += 1
    g.quantity += t.quantity
    g.proceeds += t.proceeds
    g.realizedPl += t.realizedPl
    g.companyName ??= t.companyName
    map.set(t.tickerCode, g)
  }
  return [...map.values()]
}

export function groupDividendsByTicker(rows: DividendRow[]): DividendByTicker[] {
  const map = new Map<string, DividendByTicker>()
  for (const d of rows) {
    const g = map.get(d.tickerCode) ?? {
      tickerCode: d.tickerCode,
      companyName: d.companyName,
      payments: 0,
      amountNet: 0,
    }
    g.payments += 1
    g.amountNet += d.amountNet
    g.companyName ??= d.companyName
    map.set(d.tickerCode, g)
  }
  return [...map.values()]
}

export function summarizeYear(trades: RealizedTrade[], dividends: DividendRow[]): IncomeYearSummary {
  const realizedTotal = trades.reduce((s, t) => s + t.realizedPl, 0)
  const dividendTotal = dividends.reduce((s, d) => s + d.amountNet, 0)
  return {
    realizedTotal,
    gainCount: trades.filter((t) => t.realizedPl >= 0).length,
    lossCount: trades.filter((t) => t.realizedPl < 0).length,
    dividendTotal,
    dividendTickers: new Set(dividends.map((d) => d.tickerCode)).size,
    dividendPayments: dividends.length,
    confirmedTotal: realizedTotal + dividendTotal,
  }
}

export type SortDir = 'desc' | 'asc'

/**
 * 指定列で並び替える（数値・文字列・null 対応。null は方向に関わらず末尾）。
 * 同値は元の順序を保つ（Array.prototype.sort は安定ソート）。元配列は変更しない。
 */
export function sortRows<T>(rows: T[], key: keyof T, dir: SortDir): T[] {
  const sign = dir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const va = a[key]
    const vb = b[key]
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'number' && typeof vb === 'number') return sign * (va - vb)
    return sign * String(va).localeCompare(String(vb), 'ja')
  })
}

/** 表示用の銘柄名（株式は「コード 名前」、投資信託はファンド名＝tickerCode のみ） */
export function displayName(tickerCode: string, companyName: string | null): string {
  return companyName ? `${tickerCode} ${companyName}` : tickerCode
}
