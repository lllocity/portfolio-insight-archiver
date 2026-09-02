// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, jsonResponse } from '../_shared/cors.ts'

// 株式コード形式（4桁数字 or 3桁数字＋英数字1桁）。csv-parser.ts の extractTickerCode と同じ判定。
// 投資信託はファンド名がそのまま ticker_code に入るため、これに一致しない＝除外対象。
const STOCK_CODE = /^\d{3}[0-9A-Z]$/

const PAGE_SIZE = 1000

interface HoldingRow {
  snapshot_id: number
  ticker_code: string
  current_price: number
  daily_change: number
  total_quantity: number
}

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
    // スナップショット id → 日付
    const { data: snapshots, error: snapErr } = await supabase
      .from('snapshots')
      .select('id, snapshot_date')
      .eq('user_id', user.id)
    if (snapErr) throw snapErr

    const dateById = new Map<number, string>(
      ((snapshots as any[]) ?? []).map((s) => [s.id as number, s.snapshot_date as string]),
    )
    if (dateById.size === 0) return jsonResponse([])

    // holdings を全件ページング取得（PostgREST は 1件のリクエストで最大 1000 行）
    const holdings: HoldingRow[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('holdings')
        .select('snapshot_id, ticker_code, current_price, daily_change, total_quantity')
        .eq('user_id', user.id)
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw error
      const rows = (data as any[]) ?? []
      holdings.push(...(rows as HoldingRow[]))
      if (rows.length < PAGE_SIZE) break
    }

    // snapshot_id ごとに 騰落幅 / 前日評価額 を集計（株式のみ）
    const agg = new Map<number, { changeAmount: number; prevValuation: number }>()
    for (const h of holdings) {
      if (!STOCK_CODE.test(h.ticker_code)) continue // 投信を除外
      const qty = Number(h.total_quantity)
      const change = Number(h.daily_change)
      const price = Number(h.current_price)
      const cur = agg.get(h.snapshot_id) ?? { changeAmount: 0, prevValuation: 0 }
      cur.changeAmount += change * qty
      cur.prevValuation += (price - change) * qty
      agg.set(h.snapshot_id, cur)
    }

    const result = [...agg.entries()]
      .filter(([, v]) => v.prevValuation !== 0) // 株式保有ゼロ／分母0は除外
      .map(([snapshotId, v]) => ({
        snapshotDate: dateById.get(snapshotId)!,
        changeAmount: Math.round(v.changeAmount),
        changePct: Number((v.changeAmount / v.prevValuation * 100).toFixed(4)),
      }))
      .filter((r) => r.snapshotDate != null)
      .sort((a, b) => (a.snapshotDate < b.snapshotDate ? 1 : -1)) // 日付降順

    return jsonResponse(result)
  } catch (e) {
    console.error('daily-change-ranking error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
