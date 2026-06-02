import { supabase } from '@/lib/supabase'
import type { ImportResult } from '@/types/import'

export async function importCsv(file: File, snapshotDate?: string): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  if (snapshotDate) formData.append('snapshotDate', snapshotDate)
  const { data, error } = await supabase.functions.invoke('csv-import', {
    body: formData,
  })
  if (error) throw error
  return data as ImportResult
}
