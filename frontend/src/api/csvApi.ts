import { apiClient } from './client'
import type { ImportResult } from '@/types/import'

export async function importCsv(file: File, snapshotDate?: string): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  if (snapshotDate) formData.append('snapshotDate', snapshotDate)
  const response = await apiClient.post<ImportResult>('/csv/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}
