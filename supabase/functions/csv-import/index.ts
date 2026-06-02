// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { parseCsv } from '../_shared/csv-parser.ts'
import { fetchAndCacheJQuantsMetadata } from '../_shared/jquants.ts'

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
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const snapshotDateStr = formData.get('snapshotDate') as string | null

    if (!file) return jsonResponse({ error: 'No file provided' }, 400)

    const buffer = await file.arrayBuffer()
    const text = new TextDecoder('shift-jis').decode(buffer)
    const records = parseCsv(text)

    const snapshotDate = snapshotDateStr ??
      new Date().toLocaleString('sv', { timeZone: 'Asia/Tokyo' }).slice(0, 10)

    const totalValuation = records.reduce((s, r) => s + r.totalValuation, 0)
    const totalProfitLoss = records.reduce((s, r) => s + r.totalProfitLoss, 0)
    const totalCost = totalValuation - totalProfitLoss
    const totalProfitLossPct = totalCost !== 0
      ? parseFloat((totalProfitLoss / totalCost * 100).toFixed(4))
      : 0

    const { data: snapshot, error: snapError } = await supabase
      .from('snapshots')
      .upsert(
        {
          user_id: user.id,
          snapshot_date: snapshotDate,
          total_valuation: Math.round(totalValuation),
          total_profit_loss: Math.round(totalProfitLoss),
          total_profit_loss_pct: totalProfitLossPct,
          holding_count: records.length,
        },
        { onConflict: 'user_id,snapshot_date' },
      )
      .select()
      .single()

    if (snapError) throw snapError

    await supabase.from('holdings').delete().eq('snapshot_id', (snapshot as any).id)

    const { error: holdingsError } = await supabase.from('holdings').insert(
      records.map((r) => ({
        user_id: user.id,
        snapshot_id: (snapshot as any).id,
        ticker_code: r.tickerCode,
        total_quantity: r.totalQuantity,
        weighted_avg_purchase_price: r.weightedAvgPurchasePrice,
        current_price: r.currentPrice,
        daily_change: r.dailyChange,
        daily_change_pct: r.dailyChangePct,
        total_profit_loss: Math.round(r.totalProfitLoss),
        total_profit_loss_pct: r.totalProfitLossPct,
        total_valuation: Math.round(r.totalValuation),
      })),
    )
    if (holdingsError) throw holdingsError

    const tickerCodes = records.map((r) => r.tickerCode)
    await fetchAndCacheJQuantsMetadata(tickerCodes, supabase).catch((e) =>
      console.warn('J-Quants fetch failed:', e)
    )

    return jsonResponse({
      success: true,
      snapshotDate,
      importedCount: records.length,
      warnings: null,
    })
  } catch (e) {
    console.error('csv-import error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
