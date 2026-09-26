// 銘柄種別の判定。
// 株式・ETF は東証の証券コード形式（4桁、または 130A のような英字入り新コード）。
// 投資信託はコードを持たずファンド名がそのまま ticker_code に入るため、これに一致しない。
// ※ frontend/src/lib/assetType.ts と同一定義。変更時は両方を揃えること。
const STOCK_CODE = /^\d{3}[0-9A-Z]$/

export function isStockCode(tickerCode: string): boolean {
  return STOCK_CODE.test(tickerCode)
}
