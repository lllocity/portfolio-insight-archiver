// 累計損益（含み＋実現＋配当）関連の型
// 金額は集計のため number で保持し、表示時に formatter へ渡す。

export interface RealizedPnlRow {
  tradeDate: string // YYYY-MM-DD
  account: string
  tickerCode: string
  companyName: string | null
  quantity: number
  proceeds: number
  avgCost: number | null
  realizedPl: number // 税引前
}

export interface DividendRow {
  payDate: string // YYYY-MM-DD
  account: string
  product: string | null
  tickerCode: string
  companyName: string | null
  quantity: number | null
  amountNet: number // 税引後
}

// 累計損益（含み＋実現＋配当）の内訳（含み損益は portfolioStore 側から合算する）
export interface LifetimeTotals {
  realizedTotal: number // Σ実現損益（税引前）
  dividendTotal: number // Σ受取配当（税引後）
  coverageRange: { from: string; to: string } | null // 取り込み済みデータの集計期間
}

// realized-import / dividend-import Edge Function のレスポンス型
export interface ImportRangeResult {
  success: boolean
  importedCount: number
  skipped: number
  dateRange: { from: string; to: string } | null
}

// 各スナップショット日時点の累計損益の内訳（含み／実現累計／配当累計）
export interface CumulativeBreakdownPoint {
  date: string
  unrealized: number // 含み損益(t)
  realizedCum: number // Σ実現損益(≤t)
  dividendCum: number // Σ受取配当(≤t)
  total: number // 累計損益 ＝ 上3つの合計
}

// 年ごと（暦年）サマリの1行
export interface YearlySummaryRow {
  year: number
  realizedTotal: number
  dividendTotal: number
  confirmedTotal: number // realizedTotal + dividendTotal
  isCurrentYear: boolean // 当年（YTD・部分期間）か
}
