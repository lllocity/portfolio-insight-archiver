// csv-import Edge Function のレスポンス型
export interface ImportResult {
  success: boolean
  snapshotDate: string
  importedCount: number
  warnings: string[] | null
}
