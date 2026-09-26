// 銘柄種別の判定（純関数・テスト可能）
// 株式・ETF は東証の証券コード形式（4桁、または 130A のような英字入り新コード）。
// 投資信託はコードを持たずファンド名がそのまま tickerCode に入るため、これに一致しない。
// ※ supabase/functions/_shared/asset-type.ts・supabase/migrations/007（SQL関数）と同一定義。変更時は全て揃えること。
const STOCK_CODE = /^\d{3}[0-9A-Z]$/

export function isStockCode(tickerCode: string): boolean {
  return STOCK_CODE.test(tickerCode)
}
