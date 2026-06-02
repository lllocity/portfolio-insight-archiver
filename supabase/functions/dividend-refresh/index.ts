// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parse } from 'https://esm.sh/node-html-parser@6.1.13'
import { handleCors, jsonResponse } from '../_shared/cors.ts'

const DELAY_MS = 1000
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseNumber(text: string | undefined): number | null {
  if (!text) return null
  const cleaned = text.trim().replace(/,/g, '')
  if (cleaned === '---' || cleaned === '') return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

interface DividendInfo {
  annualDividendPerShare: number | null
  dividendMonths: string | null
}

async function scrapeOne(code: string): Promise<DividendInfo> {
  const url = `https://finance.yahoo.co.jp/quote/${code}.T/dividend`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) return { annualDividendPerShare: null, dividendMonths: null }

  const html = await res.text()
  const doc = parse(html)

  // 1株当たり配当金（会社予想）
  let dps: number | null = null
  const dvdinfo = doc.querySelector('section#dvdinfo')
  if (dvdinfo) {
    const valueEl = dvdinfo.querySelector('ul > li:first-child dd [class*=DataListItem__value]')
    if (valueEl) dps = parseNumber(valueEl.text)
  }

  // フォールバック: 直近実績の配当金
  if (dps === null) {
    const tables = doc.querySelectorAll('table')
    if (tables.length >= 2) {
      const firstRow = tables[1].querySelector('tbody tr')
      if (firstRow) {
        const tds = firstRow.querySelectorAll('td')
        if (tds.length > 0) {
          const valueEl = tds[0].querySelector('[class*=StyledNumber__value]')
          if (valueEl) dps = parseNumber(valueEl.text)
        }
      }
    }
  }

  // 支払い月の推定
  let dividendMonths: string | null = null
  if (dvdinfo) {
    const dateEl = dvdinfo.querySelector('ul > li:first-child [class*=DataListItem__date]')
    if (dateEl) {
      const dateText = dateEl.text.replace(/[^\d/]/g, '')
      const parts = dateText.split('/')
      if (parts.length >= 2) {
        const fyeMonth = parseInt(parts[1])
        const tables = doc.querySelectorAll('table')
        if (tables.length > 0) {
          const forecastRow = tables[0].querySelector('tbody tr')
          if (forecastRow) {
            const tds = forecastRow.querySelectorAll('td')
            const paymentMonths: number[] = []
            for (let i = 1; i <= 4 && i < tds.length; i++) {
              const valueEl = tds[i].querySelector('[class*=StyledNumber__value]')
              if (!valueEl) continue
              const val = parseNumber(valueEl.text)
              if (val !== null && val > 0) {
                const qEndMonth = ((fyeMonth - (4 - i) * 3 - 1 + 120) % 12) + 1
                let paymentMonth = qEndMonth + 3
                if (paymentMonth > 12) paymentMonth -= 12
                paymentMonths.push(paymentMonth)
              }
            }
            if (paymentMonths.length > 0) {
              dividendMonths = [...new Set(paymentMonths)].sort((a, b) => a - b).join(',')
            }
          }
        }
      }
    }
  }

  return { annualDividendPerShare: dps, dividendMonths }
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
    // 最新スナップショットの銘柄コードを取得
    const { data: snapshot } = await supabase
      .from('snapshots')
      .select('id')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!snapshot) return jsonResponse({ updated: 0 })

    const { data: holdings } = await supabase
      .from('holdings')
      .select('ticker_code')
      .eq('snapshot_id', (snapshot as any).id)

    const stockCodes = ((holdings as any[]) ?? [])
      .map((h) => h.ticker_code)
      .filter((c) => /^\d{3}[0-9A-Z]$/.test(c))

    let updated = 0
    for (const code of stockCodes) {
      await sleep(DELAY_MS)
      try {
        const { annualDividendPerShare, dividendMonths } = await scrapeOne(code)
        await supabase
          .from('stock_meta_cache')
          .update({
            annual_dividend_per_share: annualDividendPerShare,
            dividend_months: dividendMonths,
            cached_at: new Date().toISOString(),
          })
          .eq('ticker_code', code)
        updated++
      } catch (e) {
        console.warn(`Dividend scrape failed for ${code}:`, e)
      }
    }

    return jsonResponse({ updated })
  } catch (e) {
    console.error('dividend-refresh error:', e)
    return jsonResponse({ error: String(e) }, 500)
  }
})
