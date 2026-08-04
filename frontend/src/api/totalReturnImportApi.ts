import { supabase } from '@/lib/supabase'
import type { ImportRangeResult } from '@/types/totalReturn'

// 実現損益CSV（realized-import）/ 配当CSV（dividend-import）の取り込み。
// csvApi.importCsv と同方針（FormData で file を送信）。

async function invokeImport(fnName: string, files: File[], errMsg: string): Promise<ImportRangeResult> {
  const formData = new FormData()
  for (const f of files) formData.append('file', f)
  const { data, error } = await supabase.functions.invoke(fnName, { body: formData })
  if (error) throw new Error(errMsg)
  return data as ImportRangeResult
}

export function importRealizedPnl(files: File[]): Promise<ImportRangeResult> {
  return invokeImport('realized-import', files, '実現損益の取り込みに失敗しました。ファイルを確認して再試行してください。')
}

export function importDividends(files: File[]): Promise<ImportRangeResult> {
  return invokeImport('dividend-import', files, '配当の取り込みに失敗しました。ファイルを確認して再試行してください。')
}
