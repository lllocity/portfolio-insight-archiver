// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, jsonResponse } from '../_shared/cors.ts'

const JPY = new Intl.NumberFormat('ja-JP')

function fmtPl(val: number): string {
  return (val >= 0 ? '+¥' : '-¥') + JPY.format(Math.abs(val))
}
function fmtPct(val: number): string {
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%'
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
    // Latest + previous snapshots
    const { data: snapshots } = await supabase
      .from('snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(2)

    if (!snapshots || snapshots.length === 0) {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    const latest = (snapshots as any[])[0]
    const previous = (snapshots as any[])[1] ?? null

    const { data: holdings } = await supabase
      .from('holdings')
      .select('*')
      .eq('snapshot_id', latest.id)

    const tickerCodes = ((holdings as any[]) ?? []).map((h) => h.ticker_code)

    const [{ data: metaList }, { data: memoList }, { data: prevHoldings }] = await Promise.all([
      supabase.from('stock_meta_cache').select('*').in('ticker_code', tickerCodes),
      supabase.from('stock_memo').select('*').eq('user_id', user.id).in('ticker_code', tickerCodes),
      previous
        ? supabase.from('holdings').select('ticker_code, total_quantity, total_valuation').eq('snapshot_id', previous.id)
        : Promise.resolve({ data: [] }),
    ])

    const metaMap = Object.fromEntries(((metaList as any[]) ?? []).map((m) => [m.ticker_code, m]))
    const memoMap = Object.fromEntries(((memoList as any[]) ?? []).map((m) => [m.ticker_code, m.content]))
    const prevMap = Object.fromEntries(((prevHoldings as any[]) ?? []).map((h) => [h.ticker_code, h]))

    // Sector aggregation
    const sectorMap = new Map<string, number>()
    let totalValuation = 0
    let totalDividend = 0

    const enriched = ((holdings as any[]) ?? []).map((h) => {
      const meta = metaMap[h.ticker_code]
      const sectorName = meta?.sector33_name ?? (/^\d{3}[0-9A-Z]$/.test(h.ticker_code) ? '不明' : '投資信託')
      const val = parseFloat(h.total_valuation)
      sectorMap.set(sectorName, (sectorMap.get(sectorName) ?? 0) + val)
      totalValuation += val
      const annualDiv = meta?.annual_dividend_per_share != null
        ? parseFloat(meta.annual_dividend_per_share) * parseFloat(h.total_quantity)
        : 0
      if (annualDiv > 0) totalDividend += annualDiv
      return { h, meta, sectorName, annualDiv }
    })

    // Build prompt
    let sb = '# ポートフォリオ分析依頼\n\n'

    // Section 1
    sb += '## 1. ポートフォリオ概要\n\n'
    sb += '| 項目 | 値 |\n|---|---|\n'
    sb += `| スナップショット日 | ${latest.snapshot_date} |\n`
    sb += `| 総評価額 | ¥${JPY.format(latest.total_valuation)} |\n`
    sb += `| 総損益 | ${fmtPl(latest.total_profit_loss)}（${fmtPct(parseFloat(latest.total_profit_loss_pct))}） |\n`
    sb += `| 保有銘柄数 | ${latest.holding_count}銘柄 |\n`
    sb += `| セクター数 | ${sectorMap.size}業種 |\n`
    if (totalDividend > 0) {
      const yld = (totalDividend / totalValuation * 100).toFixed(2)
      sb += `| 年間配当合計（予想） | ¥${JPY.format(Math.round(totalDividend))} |\n`
      sb += `| 配当利回り（予想） | ${yld}% |\n`
    }
    sb += '\n'

    // Section 2
    sb += '## 2. 保有銘柄・指標データ\n\n'
    sb += '| 銘柄コード | 企業名 | セクター | 数量 | 評価額(円) | 損益率(%) | 年間配当額(円) | 支払い月 |\n'
    sb += '|---|---|---|---|---|---|---|---|\n'
    for (const { h, meta, sectorName, annualDiv } of enriched) {
      sb += `| ${h.ticker_code} | ${meta?.company_name ?? '-'} | ${sectorName} | `
      sb += `${h.total_quantity} | ${JPY.format(h.total_valuation)} | `
      sb += `${h.total_profit_loss_pct} | `
      sb += `${annualDiv > 0 ? JPY.format(Math.round(annualDiv)) : '-'} | `
      sb += `${meta?.dividend_months ?? '-'} |\n`
    }
    sb += '\n'

    // Section 3
    sb += '## 3. セクター別構成比\n\n'
    sb += '| セクター | 構成比(%) | 評価額(円) |\n|---|---|---|\n'
    const sortedSectors = Array.from(sectorMap.entries()).sort((a, b) => b[1] - a[1])
    for (const [name, val] of sortedSectors) {
      const pct = totalValuation > 0 ? (val / totalValuation * 100).toFixed(2) : '0'
      sb += `| ${name} | ${pct} | ${JPY.format(Math.round(val))} |\n`
    }
    sb += '\n'

    // Section 4: Diff
    sb += '## 4. 前回からの変化\n\n'
    if (!previous) {
      sb += '（初回スナップショットのため差分なし）\n\n'
    } else {
      const currentCodes = new Set(((holdings as any[]) ?? []).map((h) => h.ticker_code))
      const prevCodes = new Set(Object.keys(prevMap))
      const added = [...currentCodes].filter((c) => !prevCodes.has(c))
      const removed = [...prevCodes].filter((c) => !currentCodes.has(c))
      sb += '| 変化の種類 | 銘柄コード | 企業名 | 変化内容 |\n|---|---|---|---|\n'
      for (const c of added) {
        sb += `| 追加 | ${c} | ${metaMap[c]?.company_name ?? '-'} | 新規購入 |\n`
      }
      for (const c of removed) {
        sb += `| 除去 | ${c} | ${metaMap[c]?.company_name ?? '-'} | 売却・整理 |\n`
      }
      if (added.length === 0 && removed.length === 0) sb += '（銘柄の追加・除去なし）\n'
      sb += '\n'
    }

    // Section 5: Memos
    const memoEntries = enriched.filter(({ h }) => memoMap[h.ticker_code])
    if (memoEntries.length > 0) {
      sb += '## 5. 銘柄別メモ（保有方針・アドバイス履歴）\n\n'
      sb += '| 銘柄コード | 企業名 | メモ |\n|---|---|---|\n'
      for (const { h, meta } of memoEntries) {
        sb += `| ${h.ticker_code} | ${meta?.company_name ?? '-'} | ${memoMap[h.ticker_code]} |\n`
      }
      sb += '\n'
    }

    // Section 6
    sb += '## 6. 投資方針（変更がある場合のみ記入）\n\n'
    sb += '（変更なし）\n\n'

    // Section 7
    sb += '## 7. 分析依頼\n\n以下の観点から分析・アドバイスをお願いします:\n\n'
    sb += '- [ ] 現在のポートフォリオの総合評価\n'
    sb += '- [ ] 買い増しを検討すべき銘柄とその理由\n'
    sb += '- [ ] 整理・売却を検討すべき銘柄とその理由（機会コスト比較含む）\n'
    sb += '- [ ] セクター偏りへの指摘と改善提案\n'
    sb += '- [ ] 投資方針に合致しているかの評価\n'
    sb += '- [ ] 配当収入の評価（配当利回り水準・月別支払い分散の偏り）\n'
    sb += '- [ ] 配当の観点から買い増し・整理を検討すべき銘柄\n'
    sb += '- [ ] その他：（自由記入）\n\n'

    // Section 8
    sb += '## 8. 今回の気になること・質問（任意）\n\n（自由記入）\n'

    return jsonResponse({ prompt: sb })
  } catch (e) {
    console.error('prompt-latest error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
