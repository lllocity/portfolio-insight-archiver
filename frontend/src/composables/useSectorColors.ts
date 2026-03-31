import type { SectorAllocation } from '@/types/portfolio'

const FIXED_COLORS: Record<string, string> = {
  '投資信託': '#94a3b8',
  '不明': '#cbd5e1'
}

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6',
  '#6366f1', '#a3e635', '#fb923c', '#f43f5e', '#0ea5e9',
  '#22c55e', '#eab308', '#d946ef', '#64748b', '#78716c'
]

export function buildSectorColorMap(sectors: SectorAllocation[]): Record<string, string> {
  const sorted = [...sectors].sort((a, b) => parseFloat(b.allocationPct) - parseFloat(a.allocationPct))
  let paletteIdx = 0
  const map: Record<string, string> = {}
  for (const s of sorted) {
    map[s.sector33Name] = FIXED_COLORS[s.sector33Name] ?? PALETTE[paletteIdx++ % PALETTE.length]
  }
  return map
}

export { FIXED_COLORS, PALETTE }
