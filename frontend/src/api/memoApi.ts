import { apiClient } from './client'

export async function upsertMemo(tickerCode: string, content: string): Promise<void> {
  await apiClient.put(`/memos/${tickerCode}`, { content })
}

export async function deleteMemo(tickerCode: string): Promise<void> {
  await apiClient.delete(`/memos/${tickerCode}`)
}
