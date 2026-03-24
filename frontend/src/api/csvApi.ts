import { apiClient } from './client'
import type { CsvImportRequest, ImportResult } from '@/types/import'

export async function importCsv(request: CsvImportRequest): Promise<ImportResult> {
  const response = await apiClient.post<ImportResult>('/csv/import', request)
  return response.data
}
