// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

  try {
    const url = new URL(req.url)
    const date = url.searchParams.get('date')
    if (!date) return jsonResponse({ error: 'date parameter required' }, 400)

    const { data: snapshot } = await supabase
      .from('snapshots')
      .select('id')
      .eq('user_id', user.id)
      .eq('snapshot_date', date)
      .maybeSingle()

    if (!snapshot) return jsonResponse({ error: 'Snapshot not found' }, 404)

    const { data: holdings } = await supabase
      .from('holdings')
      .select('*')
      .eq('snapshot_id', (snapshot as any).id)

    const tickerCodes = ((holdings as any[]) ?? []).map((h) => h.ticker_code)
    const { data: metaList } = await supabase
      .from('stock_meta_cache')
      .select('*')
      .in('ticker_code', tickerCodes)

    const metaMap = Object.fromEntries(((metaList as any[]) ?? []).map((m) => [m.ticker_code, m]))

    const result = ((holdings as any[]) ?? []).map((h) => {
      const meta = metaMap[h.ticker_code]
      return {
        tickerCode: h.ticker_code,
        companyName: meta?.company_name ?? null,
        sector33Name: meta?.sector33_name ?? null,
        totalQuantity: String(h.total_quantity),
        weightedAvgPurchasePrice: String(h.weighted_avg_purchase_price),
        currentPrice: String(h.current_price),
        dailyChange: String(h.daily_change),
        dailyChangePct: String(h.daily_change_pct),
        totalProfitLoss: String(h.total_profit_loss),
        totalProfitLossPct: String(h.total_profit_loss_pct),
        totalValuation: String(h.total_valuation),
      }
    })

    return jsonResponse(result)
  } catch (e) {
    console.error('snapshot-holdings error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
