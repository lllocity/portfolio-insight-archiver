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
    const { from, to } = await req.json()
    if (!from || !to) return jsonResponse({ error: 'from and to parameters required' }, 400)

    const [{ data: fromSnap }, { data: toSnap }] = await Promise.all([
      supabase.from('snapshots').select('id').eq('user_id', user.id).eq('snapshot_date', from).maybeSingle(),
      supabase.from('snapshots').select('id').eq('user_id', user.id).eq('snapshot_date', to).maybeSingle(),
    ])

    if (!fromSnap || !toSnap) return jsonResponse({ error: 'Snapshot not found' }, 404)

    const [{ data: fromHoldings }, { data: toHoldings }] = await Promise.all([
      supabase.from('holdings').select('ticker_code, total_quantity').eq('snapshot_id', (fromSnap as any).id),
      supabase.from('holdings').select('ticker_code, total_quantity').eq('snapshot_id', (toSnap as any).id),
    ])

    const fromMap = Object.fromEntries(((fromHoldings as any[]) ?? []).map((h) => [h.ticker_code, h.total_quantity]))
    const toMap = Object.fromEntries(((toHoldings as any[]) ?? []).map((h) => [h.ticker_code, h.total_quantity]))

    const added = Object.keys(toMap).filter((c) => !fromMap[c])
    const removed = Object.keys(fromMap).filter((c) => !toMap[c])
    const allTickers = [...new Set([...added, ...removed])]

    const { data: metaList } = await supabase
      .from('stock_meta_cache')
      .select('ticker_code, company_name')
      .in('ticker_code', allTickers)

    const metaMap = Object.fromEntries(((metaList as any[]) ?? []).map((m) => [m.ticker_code, m.company_name]))

    return jsonResponse({
      addedTickers: added.map((c) => ({
        tickerCode: c,
        companyName: metaMap[c] ?? null,
        totalQuantity: String(toMap[c]),
      })),
      removedTickers: removed.map((c) => ({
        tickerCode: c,
        companyName: metaMap[c] ?? null,
        totalQuantity: String(fromMap[c]),
      })),
    })
  } catch (e) {
    console.error('snapshot-diff error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
