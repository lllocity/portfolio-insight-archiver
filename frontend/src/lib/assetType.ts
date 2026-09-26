// 銘柄種別の判定（純関数・テスト可能）
// 株式・ETF は東証の証券コード形式（4桁、または 130A のような英字入り新コード）。
// 投資信託はコードを持たずファンド名がそのまま tickerCode に入るため、これに一致しない。
// ※ supabase/functions/_shared/asset-type.ts と同一定義。変更時は両方を揃え、holdings.is_stock の再設定（新規マイグレーション）も行うこと。
const STOCK_CODE = /^\d{3}[0-9A-Z]$/

export function isStockCode(tickerCode: string): boolean {
  return STOCK_CODE.test(tickerCode)
}
