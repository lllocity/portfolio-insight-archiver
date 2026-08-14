// 累計損益（含み＋実現＋配当）の集計（純関数・テスト可能）
import type {
  CumulativeBreakdownPoint,
  DividendRow,
  LifetimeTotals,
  RealizedPnlRow,
  YearlySummaryRow,
} from '@/types/totalReturn'

function yearOf(date: string): number {
  return parseInt(date.slice(0, 4), 10)
}

/**
 * 各スナップショット日時点の累計損益を「含み／実現累計／配当累計」の内訳で算出する。
 *   含み損益(t) ＋ Σ実現損益(約定日 ≤ t) ＋ Σ受取配当(受渡日 ≤ t) ＝ 累計損益(t)
 * 日付は 'YYYY-MM-DD' 前提（辞書順比較＝時系列比較）。snapshots の順序を保って返す。
 */
export function cumulativeBreakdownByDate(
  snapshots: { snapshotDate: string; unrealized: number }[],
  realized: RealizedPnlRow[],
  dividends: DividendRow[],
): CumulativeBreakdownPoint[] {
  return snapshots.map((s) => {
    const realizedCum = realized.reduce((acc, r) => acc + (r.tradeDate <= s.snapshotDate ? r.realizedPl : 0), 0)
    const dividendCum = dividends.reduce((acc, d) => acc + (d.payDate <= s.snapshotDate ? d.amountNet : 0), 0)
    return {
      date: s.snapshotDate,
      unrealized: s.unrealized,
      realizedCum,
      dividendCum,
      total: s.unrealized + realizedCum + dividendCum,
    }
  })
}

/**
 * 生涯の実現損益・受取配当の合計と、取り込み済みデータの集計期間を求める。
 * 含み損益は現在残高（portfolioStore）側から合算するためここには含めない。
 */
export function lifetimeTotals(
  realized: RealizedPnlRow[],
  dividends: DividendRow[],
): LifetimeTotals {
  const realizedTotal = realized.reduce((s, r) => s + r.realizedPl, 0)
  const dividendTotal = dividends.reduce((s, d) => s + d.amountNet, 0)

  const dates = [
    ...realized.map((r) => r.tradeDate),
    ...dividends.map((d) => d.payDate),
  ].sort()
  const coverageRange = dates.length > 0
    ? { from: dates[0], to: dates[dates.length - 1] }
    : null

  return { realizedTotal, dividendTotal, coverageRange }
}

/**
 * 暦年（1/1〜12/31）ごとに実現損益・受取配当を集計する。
 * 当年（currentYear）は該当データが無くても必ず1行含める（YTD 0表示）。
 * 降順（新しい年が上）で返す。
 */
export function yearlySummary(
  realized: RealizedPnlRow[],
  dividends: DividendRow[],
  currentYear: number,
): YearlySummaryRow[] {
  const map = new Map<number, { realized: number; dividend: number }>()
  const bucket = (year: number) => {
    let e = map.get(year)
    if (!e) { e = { realized: 0, dividend: 0 }; map.set(year, e) }
    return e
  }

  for (const r of realized) bucket(yearOf(r.tradeDate)).realized += r.realizedPl
  for (const d of dividends) bucket(yearOf(d.payDate)).dividend += d.amountNet
  bucket(currentYear) // 当年は必ず1行（YTD）

  return [...map.entries()]
    .map(([year, e]) => ({
      year,
      realizedTotal: e.realized,
      dividendTotal: e.dividend,
      confirmedTotal: e.realized + e.dividend,
      isCurrentYear: year === currentYear,
    }))
    .sort((a, b) => b.year - a.year)
}
