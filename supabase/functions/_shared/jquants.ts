// deno-lint-ignore-file no-explicit-any
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function fetchAndCacheJQuantsMetadata(
  tickerCodes: string[],
  supabase: SupabaseClient,
): Promise<void> {
  const apiKey = Deno.env.get('JQUANTS_API_KEY')
  if (!apiKey) return

  const stockCodes = tickerCodes.filter((c) => /^\d{3}[0-9A-Z]$/.test(c))
  if (stockCodes.length === 0) return

  const { data: cached } = await supabase
    .from('stock_meta_cache')
    .select('ticker_code, cached_at')
    .in('ticker_code', stockCodes)

  const now = Date.now()
  const validCodes = new Set(
    ((cached as any[]) ?? [])
      .filter((c) => now - new Date(c.cached_at).getTime() < 24 * 60 * 60 * 1000)
      .map((c) => c.ticker_code),
  )

  const staleCodes = stockCodes.filter((c) => !validCodes.has(c))
  if (staleCodes.length === 0) return

  const response = await fetch('https://api.jquants.com/v2/equities/master', {
    headers: { 'x-api-key': apiKey },
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) {
    console.warn('J-Quants API error:', response.status)
    return
  }

  const json = await response.json()
  const data: Record<string, string>[] = json.data ?? []
  const targetSet = new Set(staleCodes)
  const toUpsert = []

  for (const item of data) {
    const rawCode = item['Code'] ?? ''
    const code = rawCode.length === 5 ? rawCode.slice(0, 4) : rawCode
    if (!targetSet.has(code)) continue
    toUpsert.push({
      ticker_code: code,
      company_name: item['CoName'] ?? null,
      sector33_code: item['S33'] ?? null,
      sector33_name: item['S33Nm'] ?? null,
      cached_at: new Date().toISOString(),
    })
  }

  if (toUpsert.length > 0) {
    await supabase.from('stock_meta_cache').upsert(toUpsert, { onConflict: 'ticker_code' })
  }
}
