// 生涯トータルリターン（実現損益・受取配当）関連の型
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

// 生涯トータルリターンの内訳（含み損益は portfolioStore 側から合算する）
export interface LifetimeTotals {
  realizedTotal: number // Σ実現損益（税引前）
  dividendTotal: number // Σ受取配当（税引後）
  coverageRange: { from: string; to: string } | null // 取り込み済みデータの集計期間
}

// 年ごと（暦年）サマリの1行
export interface YearlySummaryRow {
  year: number
  realizedTotal: number
  dividendTotal: number
  confirmedTotal: number // realizedTotal + dividendTotal
  isCurrentYear: boolean // 当年（YTD・部分期間）か
}
