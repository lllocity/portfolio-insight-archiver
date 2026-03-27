import { apiClient } from './client'
import type { ImportResult } from '@/types/import'

export async function importCsv(file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<ImportResult>('/csv/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}
