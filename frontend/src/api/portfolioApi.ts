import { apiClient } from './client'
import type { PortfolioResponse } from '@/types/portfolio'

export async function fetchLatestPortfolio(): Promise<PortfolioResponse | null> {
  const response = await apiClient.get<PortfolioResponse>('/portfolio/latest', {
    validateStatus: status => status === 200 || status === 204
  })
  return response.status === 204 ? null : response.data
}
