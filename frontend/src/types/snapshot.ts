// GET /api/snapshots のレスポンス型
export interface SnapshotListItem {
  snapshotDate: string
  totalValuation: string
  totalProfitLoss: string
  totalProfitLossPct: string
  holdingCount: number
}

// GET /api/snapshots/diff のレスポンスは SnapshotDiff と同一
export type { SnapshotDiff } from './portfolio'
