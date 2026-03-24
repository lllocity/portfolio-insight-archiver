<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">セクター別構成比</h3>
    <div class="flex flex-col gap-4 md:flex-row md:items-start">
      <!-- ドーナツチャート -->
      <div class="mx-auto w-64 shrink-0">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>
      <!-- 凡例テーブル -->
      <div class="flex-1 overflow-x-auto">
        <table class="w-full text-xs" data-testid="sector-legend">
          <thead class="text-gray-500">
            <tr class="border-b border-gray-100">
              <th class="pb-1 text-left font-medium">セクター</th>
              <th class="pb-1 text-right font-medium">構成比</th>
              <th class="pb-1 text-right font-medium">評価額</th>
              <th class="pb-1 text-right font-medium">銘柄数</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="s in sortedSectors" :key="s.sector33Name" class="hover:bg-gray-50">
              <td class="py-1">{{ s.sector33Name }}</td>
              <td class="py-1 text-right font-medium">{{ s.allocationPct }}%</td>
              <td class="py-1 text-right">{{ f.formatCurrency(s.totalValuation) }}</td>
              <td class="py-1 text-right text-gray-500">{{ s.holdingCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { useFormatters } from '@/composables/useFormatters'
import type { SectorAllocation } from '@/types/portfolio'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{ sectors: SectorAllocation[] }>()
const f = useFormatters()

// 特定セクターに固定色を割り当て
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

const sortedSectors = computed(() =>
  [...props.sectors].sort((a, b) => parseFloat(b.allocationPct) - parseFloat(a.allocationPct))
)

const chartData = computed(() => {
  let paletteIdx = 0
  const colors = sortedSectors.value.map(s =>
    FIXED_COLORS[s.sector33Name] ?? PALETTE[paletteIdx++ % PALETTE.length]
  )
  return {
    labels: sortedSectors.value.map(s => s.sector33Name),
    datasets: [{
      data: sortedSectors.value.map(s => parseFloat(s.allocationPct)),
      backgroundColor: colors,
      borderWidth: 1,
      borderColor: '#fff'
    }]
  }
})

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { label: string; raw: unknown }) =>
          ` ${ctx.label}: ${ctx.raw}%`
      }
    }
  }
}
</script>
