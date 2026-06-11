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
    const { data: snapshot } = await supabase
      .from('snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!snapshot) {
      return new Response(null, {
        status: 204,
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
    }

    const { data: holdings } = await supabase
      .from('holdings')
      .select('*')
      .eq('snapshot_id', (snapshot as any).id)

    const tickerCodes = ((holdings as any[]) ?? []).map((h) => h.ticker_code)

    const [{ data: metaList }, { data: memoList }] = await Promise.all([
      supabase.from('stock_meta_cache').select('*').in('ticker_code', tickerCodes),
      supabase.from('stock_memo').select('*').eq('user_id', user.id).in('ticker_code', tickerCodes),
    ])

    const metaMap = Object.fromEntries(((metaList as any[]) ?? []).map((m) => [m.ticker_code, m]))
    const memoMap = Object.fromEntries(((memoList as any[]) ?? []).map((m) => [m.ticker_code, m.content]))

    const enriched = ((holdings as any[]) ?? []).map((h) => {
      const meta = metaMap[h.ticker_code]
      const annualDividend = meta?.annual_dividend_per_share != null
        ? parseFloat(meta.annual_dividend_per_share) * parseFloat(h.total_quantity)
        : null
      return {
        tickerCode: h.ticker_code,
        companyName: meta?.company_name ?? null,
        sectorName: meta?.sector33_name ?? (/^\d{3}[0-9A-Z]$/.test(h.ticker_code) ? '不明' : '投資信託'),
        totalQuantity: String(h.total_quantity),
        weightedAvgPurchasePrice: String(h.weighted_avg_purchase_price),
        currentPrice: String(h.current_price),
        dailyChange: String(h.daily_change),
        dailyChangePct: String(h.daily_change_pct),
        totalProfitLoss: String(h.total_profit_loss),
        totalProfitLossPct: String(h.total_profit_loss_pct),
        totalValuation: String(h.total_valuation),
        memo: memoMap[h.ticker_code] ?? null,
        estimatedAnnualDividend: annualDividend != null ? String(annualDividend) : null,
        dividendMonths: meta?.dividend_months ?? null,
      }
    })

    const cashBalance = (snapshot as any).cash_balance ?? 0

    const sectorMap = new Map<string, { valuation: number; count: number; profitLoss: number }>()
    for (const h of enriched) {
      const val = parseFloat(h.totalValuation)
      const pl = parseFloat(h.totalProfitLoss)
      const existing = sectorMap.get(h.sectorName) ?? { valuation: 0, count: 0, profitLoss: 0 }
      sectorMap.set(h.sectorName, { valuation: existing.valuation + val, count: existing.count + 1, profitLoss: existing.profitLoss + pl })
    }
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

    return jsonResponse({
      snapshot: {
        snapshotDate: (snapshot as any).snapshot_date,
        totalValuation: String((snapshot as any).total_valuation),
        cashBalance: String(cashBalance),
        totalProfitLoss: String((snapshot as any).total_profit_loss),
        totalProfitLossPct: String((snapshot as any).total_profit_loss_pct),
        holdingCount: (snapshot as any).holding_count,
      },
      holdings: enriched,
      sectors,
    })
  } catch (e) {
    console.error('portfolio-latest error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
