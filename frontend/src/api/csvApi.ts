import { supabase } from '@/lib/supabase'
import type { ImportResult } from '@/types/import'

export async function importCsv(file: File, snapshotDate?: string): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  if (snapshotDate) formData.append('snapshotDate', snapshotDate)
  const { data, error } = await supabase.functions.invoke('csv-import', {
    body: formData,
  })
  if (error) {
    // Edge Function の実際のエラーメッセージを取り出す
    const ctx = (error as { context?: Response }).context
    if (ctx instanceof Response) {
      const body = await ctx.json().catch(() => null)
      if (body?.error) throw new Error(body.error)
    }
    throw error
  }
  return data as ImportResult
}
