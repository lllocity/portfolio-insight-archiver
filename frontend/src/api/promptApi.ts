import { apiClient } from './client'
import type { PromptResponse } from '@/types/prompt'

export async function fetchLatestPrompt(): Promise<PromptResponse | null> {
  const response = await apiClient.get<PromptResponse>('/prompt/latest', {
    validateStatus: status => status === 200 || status === 204
  })
  return response.status === 204 ? null : response.data
}
