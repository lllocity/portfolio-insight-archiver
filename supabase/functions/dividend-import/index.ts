// deno-lint-ignore-file no-explicit-any
// 配当金・分配金CSV（SBI: DISTRIBUTION_*.csv）取り込み。
// 範囲リプレース方式: ファイル内の受渡日 min〜max の既存行を削除してから挿入する。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { parseDividendCsv } from '../_shared/dividend-parser.ts'
import { mergeDateRange, rangeReplaceFile } from '../_shared/range-replace.ts'

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
    const files = formData.getAll('file') as File[]
    if (files.length === 0) return jsonResponse({ error: 'No file provided' }, 400)

    // SHIFT-JIS をデコードし、ファイルごとに範囲リプレースする
    // （ファイル単位なので複数ファイル間の「間の期間」を触らない）。
    let importedCount = 0
    let skipped = 0
    let dateRange: { from: string; to: string } | null = null

    for (const f of files) {
      const text = new TextDecoder('shift-jis').decode(await f.arrayBuffer())
      const { records, skipped: sk } = parseDividendCsv(text)
      skipped += sk

      const res = await rangeReplaceFile(supabase, user.id, {
        table: 'dividends',
        dateColumn: 'pay_date',
        records,
        getDate: (r) => r.payDate,
        toRow: (r) => ({
          user_id: user.id,
          pay_date: r.payDate,
          account: r.account,
          product: r.product,
          ticker_code: r.tickerCode,
          company_name: r.companyName,
          quantity: r.quantity,
          amount_net: r.amountNet,
        }),
      })
      importedCount += res.importedCount
      dateRange = mergeDateRange(dateRange, res.dateRange)
    }

    return jsonResponse({ success: true, importedCount, skipped, dateRange })
  } catch (e) {
    console.error('dividend-import error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
