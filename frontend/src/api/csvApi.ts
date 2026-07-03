import { supabase } from '@/lib/supabase'
import type { ImportResult } from '@/types/import'

export async function importCsv(files: File[], snapshotDate?: string, cashBalance?: number): Promise<ImportResult> {
  const formData = new FormData()
  for (const f of files) formData.append('file', f)
  if (snapshotDate) formData.append('snapshotDate', snapshotDate)
  if (cashBalance !== undefined) formData.append('cashBalance', String(cashBalance))
  const { data, error } = await supabase.functions.invoke('csv-import', {
    body: formData,
  })
  if (error) throw new Error('CSVインポートに失敗しました。ファイルを確認して再試行してください。')

  // 配当情報をバックグラウンドで取得（完了を待たない）
  supabase.functions.invoke('dividend-refresh').catch(() => {})

  return data as ImportResult
}
