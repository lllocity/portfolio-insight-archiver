import { apiClient } from './client'
import type { SnapshotListItem } from '@/types/snapshot'
import type { SnapshotDiff } from '@/types/portfolio'

export async function fetchSnapshots(): Promise<SnapshotListItem[]> {
  const response = await apiClient.get<SnapshotListItem[]>('/snapshots')
  return response.data
}

export async function fetchSnapshotDiff(from: string, to: string): Promise<SnapshotDiff> {
  const response = await apiClient.get<SnapshotDiff>('/snapshots/diff', {
    params: { from, to }
  })
  return response.data
}
