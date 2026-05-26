import { apiClient } from './client'
import type { PortfolioResponse, SnapshotListItem, SectorAllocation, SnapshotDiff } from '@/types/portfolio'

export async function fetchLatestPortfolio(): Promise<PortfolioResponse | null> {
  const response = await apiClient.get<PortfolioResponse>('/portfolio/latest', {
    validateStatus: status => status === 200 || status === 204
  })
  return response.status === 204 ? null : response.data
}

export async function fetchSnapshotDates(): Promise<SnapshotListItem[]> {
  const response = await apiClient.get<SnapshotListItem[]>('/snapshots')
  return response.data
}

export async function fetchSnapshotSectors(date: string): Promise<SectorAllocation[]> {
  const response = await apiClient.get<SectorAllocation[]>(`/snapshots/${date}/sectors`)
  return response.data
}

export async function fetchSnapshotDiff(from: string, to: string): Promise<SnapshotDiff> {
  const response = await apiClient.get<SnapshotDiff>('/snapshots/diff', {
    params: { from, to }
  })
  return response.data
}
