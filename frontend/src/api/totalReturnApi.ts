import { supabase } from '@/lib/supabase'
import { fetchAll } from '@/lib/fetchAll'
import type { DividendRow, RealizedPnlRow } from '@/types/totalReturn'

// 実現損益・配当は直 PostgREST で取得する（fetchSnapshotDates と同方針）。
// RLS により自ユーザーの行のみ返るが、明示的に user_id で絞る。
// 行数が増え続けるため fetchAll でページング取得する。同一日付の行（分割約定等）が
// 多いので、ページ境界がぶれないよう id を第2ソートキーにして並び順を一意にする。

export async function fetchRealizedPnl(): Promise<RealizedPnlRow[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const data = await fetchAll(() =>
    supabase
      .from('realized_pnl')
      .select('trade_date, account, ticker_code, company_name, quantity, proceeds, avg_cost, realized_pl')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false })
      .order('id', { ascending: false }),
  ).catch((e) => {
    console.error('実現損益の取得に失敗しました:', e)
    throw new Error('実現損益の取得に失敗しました', { cause: e })
  })
  return data.map((r) => ({
    tradeDate: r.trade_date,
    account: r.account,
    tickerCode: r.ticker_code,
    companyName: r.company_name,
    quantity: Number(r.quantity),
    proceeds: Number(r.proceeds),
    avgCost: r.avg_cost == null ? null : Number(r.avg_cost),
    realizedPl: Number(r.realized_pl),
  }))
}

export async function fetchDividends(): Promise<DividendRow[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const data = await fetchAll(() =>
    supabase
      .from('dividends')
      .select('pay_date, account, product, ticker_code, company_name, quantity, amount_net')
      .eq('user_id', user.id)
      .order('pay_date', { ascending: false })
      .order('id', { ascending: false }),
  ).catch((e) => {
    console.error('受取配当の取得に失敗しました:', e)
    throw new Error('受取配当の取得に失敗しました', { cause: e })
  })
  return data.map((d) => ({
    payDate: d.pay_date,
    account: d.account,
    product: d.product,
    tickerCode: d.ticker_code,
    companyName: d.company_name,
    quantity: d.quantity == null ? null : Number(d.quantity),
    amountNet: Number(d.amount_net),
  }))
}
