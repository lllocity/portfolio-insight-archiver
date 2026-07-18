<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-700">推移グラフ</h3>
      <div class="flex gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="rounded px-3 py-1 text-xs font-medium transition-colors"
          :class="activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import type { SnapshotListItem } from '@/types/portfolio'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps<{ snapshots: SnapshotListItem[] }>()

const tabs = [
  { key: 'assets', label: '総資産' },
  { key: 'pl', label: '損益' },
  { key: 'plPct', label: '損益率' },
] as const

type TabKey = (typeof tabs)[number]['key']
const activeTab = ref<TabKey>('assets')

// グラフ用データは日付昇順
const sorted = computed(() => [...props.snapshots].reverse())
const labels = computed(() => sorted.value.map((s) => s.snapshotDate))

const jpy = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })

const chartData = computed(() => {
  if (activeTab.value === 'assets') {
    return {
      labels: labels.value,
      datasets: [
        {
          label: '総資産',
          data: sorted.value.map((s) => parseFloat(s.totalValuation) + parseFloat(s.cashBalance)),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          borderWidth: 2,
          pointRadius: 2,
          fill: true,
          tension: 0.3,
        },
        {
          label: '株式評価額',
          data: sorted.value.map((s) => parseFloat(s.totalValuation)),
          borderColor: '#94a3b8',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [4, 3],
          pointRadius: 2,
          fill: false,
          tension: 0.3,
        },
      ],
    }
  }

  if (activeTab.value === 'pl') {
    return {
      labels: labels.value,
      datasets: [
        {
          label: '損益',
          data: sorted.value.map((s) => parseFloat(s.totalProfitLoss)),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.08)',
          borderWidth: 2,
          pointRadius: 2,
          fill: true,
          tension: 0.3,
        },
      ],
    }
  }

  // plPct
  return {
    labels: labels.value,
    datasets: [
      {
        label: '損益率',
        data: sorted.value.map((s) => parseFloat(s.totalProfitLossPct)),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.08)',
        borderWidth: 2,
        pointRadius: 2,
        fill: true,
        tension: 0.3,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  animation: false,
  plugins: {
    legend: {
      display: activeTab.value === 'assets',
      position: 'bottom' as const,
      labels: { boxWidth: 12, font: { size: 11 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; raw: unknown }) => {
          const val = ctx.raw as number
          if (activeTab.value === 'plPct') {
            const sign = val >= 0 ? '+' : ''
            return ` ${ctx.dataset.label}: ${sign}${val.toFixed(2)}%`
          }
          return ` ${ctx.dataset.label}: ${jpy.format(val).replace(/￥/g, '¥')}`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { font: { size: 10 }, maxTicksLimit: 8 },
    },
    y: {
      ticks: {
        font: { size: 10 },
        callback: (value: number | string) => {
          const v = Number(value)
          if (activeTab.value === 'plPct') return `${v.toFixed(1)}%`
          if (Math.abs(v) >= 1_000_000) return `¥${(v / 1_000_000).toFixed(1)}M`
          if (Math.abs(v) >= 10_000) return `¥${(v / 10_000).toFixed(0)}万`
          return `¥${v.toLocaleString()}`
        },
      },
    },
  },
}))
</script>
