import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, jsonResponse } from '../_shared/cors.ts'

// スナップショット日ごとの株式部分の騰落幅／前日評価額は DB 関数 daily_change_by_snapshot
// （supabase/migrations/007・008）で集計する。holdings を全件転送して集計すると履歴の増加に
// 比例して重くなるため。関数は集計・絞り込みのみで、投資信託の除外は取り込み時に判定済みの
// holdings.is_stock で行う（判定ルールは _shared/asset-type.ts）。分母0の除外・日付降順も関数側。
interface SnapshotChange {
  snapshotDate: string
  changeAmount: number
  prevValuation: number
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
    const { data, error } = await supabase.rpc('daily_change_by_snapshot')
    if (error) throw error

    // 丸めは従来どおりここで行う。ただし集計は SQL の NUMERIC（厳密値）で、従来の JS 浮動小数
    // 合算とは丸め境界（.5 ちょうど・騰落率の小数第4位）で稀に1単位ずれ得る（厳密値側が正）。
    const result = ((data as SnapshotChange[] | null) ?? [])
      .map((r) => {
        const changeAmount = Number(r.changeAmount)
        const prevValuation = Number(r.prevValuation)
        return {
          snapshotDate: r.snapshotDate,
          changeAmount: Math.round(changeAmount),
          changePct: Number((changeAmount / prevValuation * 100).toFixed(4)),
        }
      })

    return jsonResponse(result)
  } catch (e) {
    console.error('daily-change-ranking error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
