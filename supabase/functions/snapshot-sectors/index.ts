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
    const { date } = await req.json()
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
      .select('ticker_code, total_valuation')
      .eq('snapshot_id', (snapshot as any).id)

    const tickerCodes = ((holdings as any[]) ?? []).map((h) => h.ticker_code)
    const { data: metaList } = await supabase
      .from('stock_meta_cache')
      .select('ticker_code, sector33_name')
      .in('ticker_code', tickerCodes)

    const metaMap = Object.fromEntries(
      ((metaList as any[]) ?? []).map((m) => [m.ticker_code, m.sector33_name ?? '不明']),
    )

    const sectorMap = new Map<string, { valuation: number; count: number }>()
    for (const h of (holdings as any[]) ?? []) {
      const sector = metaMap[h.ticker_code] ?? (/^\d{3}[0-9A-Z]$/.test(h.ticker_code) ? '不明' : '投資信託')
      const val = parseFloat(h.total_valuation)
      const existing = sectorMap.get(sector) ?? { valuation: 0, count: 0 }
      sectorMap.set(sector, { valuation: existing.valuation + val, count: existing.count + 1 })
    }

    const totalVal = Array.from(sectorMap.values()).reduce((s, v) => s + v.valuation, 0)
    const sectors = Array.from(sectorMap.entries())
      .map(([name, { valuation, count }]) => ({
        sector33Name: name,
        totalValuation: String(Math.round(valuation)),
        allocationPct: totalVal > 0 ? (valuation / totalVal * 100).toFixed(2) : '0',
        holdingCount: count,
      }))
      .sort((a, b) => parseFloat(b.totalValuation) - parseFloat(a.totalValuation))

    return jsonResponse(sectors)
  } catch (e) {
    console.error('snapshot-sectors error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
