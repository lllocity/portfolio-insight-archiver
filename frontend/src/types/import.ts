// POST /api/csv/import のリクエスト・レスポンス型
export interface CsvImportRequest {
  filePath: string
}

export interface ImportResult {
  success: boolean
  snapshotDate: string
  importedCount: number
  docUrl: string | null
  warnings: string[] | null
}
