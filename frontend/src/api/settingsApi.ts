import { apiClient } from './client'
import type { Settings } from '@/types/settings'

export async function fetchSettings(): Promise<Settings> {
  const response = await apiClient.get<Settings>('/settings')
  return response.data
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  const response = await apiClient.put<Settings>('/settings', settings)
  return response.data
}
