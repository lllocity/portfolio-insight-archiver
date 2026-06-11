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
      .select('id, cash_balance')
      .eq('user_id', user.id)
      .eq('snapshot_date', date)
      .maybeSingle()

    if (!snapshot) return jsonResponse({ error: 'Snapshot not found' }, 404)

    const { data: holdings } = await supabase
      .from('holdings')
      .select('ticker_code, total_valuation, total_profit_loss')
      .eq('snapshot_id', (snapshot as any).id)

    const tickerCodes = ((holdings as any[]) ?? []).map((h) => h.ticker_code)
    const { data: metaList } = await supabase
      .from('stock_meta_cache')
      .select('ticker_code, sector33_name')
      .in('ticker_code', tickerCodes)

    const metaMap = Object.fromEntries(
      ((metaList as any[]) ?? []).map((m) => [m.ticker_code, m.sector33_name ?? '不明']),
    )

    const sectorMap = new Map<string, { valuation: number; count: number; profitLoss: number }>()
    for (const h of (holdings as any[]) ?? []) {
      const sector = metaMap[h.ticker_code] ?? (/^\d{3}[0-9A-Z]$/.test(h.ticker_code) ? '不明' : '投資信託')
      const val = parseFloat(h.total_valuation)
      const pl = parseFloat(h.total_profit_loss ?? '0')
      const existing = sectorMap.get(sector) ?? { valuation: 0, count: 0, profitLoss: 0 }
      sectorMap.set(sector, { valuation: existing.valuation + val, count: existing.count + 1, profitLoss: existing.profitLoss + pl })
    }

    const cashBalance = (snapshot as any).cash_balance ?? 0
    const totalStockVal = Array.from(sectorMap.values()).reduce((s, v) => s + v.valuation, 0)
    const totalAssets = totalStockVal + cashBalance
    const sectors = Array.from(sectorMap.entries())
      .map(([name, { valuation, count, profitLoss }]) => {
        const costBasis = valuation - profitLoss
        return {
          sector33Name: name,
          totalValuation: String(Math.round(valuation)),
          allocationPct: totalAssets > 0 ? (valuation / totalAssets * 100).toFixed(2) : '0',
          holdingCount: count,
          totalProfitLoss: String(Math.round(profitLoss)),
          totalProfitLossPct: costBasis > 0 ? (profitLoss / costBasis * 100).toFixed(2) : '0',
        }
      })
      .sort((a, b) => parseFloat(b.totalValuation) - parseFloat(a.totalValuation))
    if (cashBalance > 0) {
      sectors.push({
        sector33Name: '現金',
        totalValuation: String(cashBalance),
        allocationPct: totalAssets > 0 ? (cashBalance / totalAssets * 100).toFixed(2) : '0',
        holdingCount: 0,
        totalProfitLoss: '0',
        totalProfitLossPct: '0',
      })
    }

    return jsonResponse(sectors)
  } catch (e) {
    console.error('snapshot-sectors error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
