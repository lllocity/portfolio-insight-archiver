import { describe, it, expect } from 'vitest'
import { toHoldingRow } from '../../../supabase/functions/_shared/holdings-row.ts'
import type { HoldingRecord } from '../../../supabase/functions/_shared/csv-parser.ts'

function record(tickerCode: string): HoldingRecord {
  return {
    tickerCode,
    totalQuantity: 100,
    weightedAvgPurchasePrice: 2500.1234,
    currentPrice: 2800,
    dailyChange: 50,
    dailyChangePct: 1.82,
    totalProfitLoss: 29987.6,
    totalProfitLossPct: 12,
    totalValuation: 280000.4,
  }
}

describe('toHoldingRow', () => {
  it('株式コードは is_stock=true', () => {
    expect(toHoldingRow(record('7203'), 'u1', 10).is_stock).toBe(true)
    expect(toHoldingRow(record('130A'), 'u1', 10).is_stock).toBe(true)
  })

  it('ファンド名（投資信託）は is_stock=false', () => {
    expect(toHoldingRow(record('eMAXIS Slim 全世界株式(オール・カントリー)'), 'u1', 10).is_stock).toBe(false)
  })

  it('従来と同じ列・丸めで行を組み立てる', () => {
    expect(toHoldingRow(record('7203'), 'u1', 10)).toEqual({
      user_id: 'u1',
      snapshot_id: 10,
      ticker_code: '7203',
      is_stock: true,
      total_quantity: 100,
      weighted_avg_purchase_price: 2500.1234,
      current_price: 2800,
      daily_change: 50,
      daily_change_pct: 1.82,
      total_profit_loss: 29988,
      total_profit_loss_pct: 12,
      total_valuation: 280000,
    })
  })
})
