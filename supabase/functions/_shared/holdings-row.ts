// CSV の保有レコード → holdings テーブルの行（純関数・テスト可能）
// 株式／投資信託の区分（is_stock）は取り込み時にここで判定して保存する。
// DB 側（daily_change_by_snapshot 等）は判定ルールを持たず、この列で絞り込むだけにする。
import type { HoldingRecord } from './csv-parser.ts'
import { isStockCode } from './asset-type.ts'

export interface HoldingInsertRow {
  user_id: string
  snapshot_id: number
  ticker_code: string
  is_stock: boolean
  total_quantity: number
  weighted_avg_purchase_price: number
  current_price: number
  daily_change: number
  daily_change_pct: number
  total_profit_loss: number
  total_profit_loss_pct: number
  total_valuation: number
}

export function toHoldingRow(r: HoldingRecord, userId: string, snapshotId: number): HoldingInsertRow {
  return {
    user_id: userId,
    snapshot_id: snapshotId,
    ticker_code: r.tickerCode,
    is_stock: isStockCode(r.tickerCode),
    total_quantity: r.totalQuantity,
    weighted_avg_purchase_price: r.weightedAvgPurchasePrice,
    current_price: r.currentPrice,
    daily_change: r.dailyChange,
    daily_change_pct: r.dailyChangePct,
    total_profit_loss: Math.round(r.totalProfitLoss),
    total_profit_loss_pct: r.totalProfitLossPct,
    total_valuation: Math.round(r.totalValuation),
  }
}
