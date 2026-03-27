// POST /api/csv/import のレスポンス型
export interface ImportResult {
  success: boolean
  snapshotDate: string
  importedCount: number
  warnings: string[] | null
}
