<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">推移グラフ</h3>
    <Chart type="bar" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Chart } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import type { SnapshotListItem } from '@/types/portfolio'

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, LineController, PointElement, LineElement, Tooltip, Legend)

const props = defineProps<{ snapshots: SnapshotListItem[] }>()

// グラフ用データは日付昇順
const sorted = computed(() => [...props.snapshots].reverse())

const jpy = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })

const chartData = computed(() => ({
  labels: sorted.value.map((s) => s.snapshotDate),
  datasets: [
    {
      type: 'bar' as const,
      label: '総資産',
      data: sorted.value.map((s) => parseFloat(s.totalValuation) + parseFloat(s.cashBalance)),
      backgroundColor: 'rgba(59,130,246,0.65)',
      yAxisID: 'y',
      order: 2,
    },
    {
      type: 'bar' as const,
      label: '損益',
      data: sorted.value.map((s) => parseFloat(s.totalProfitLoss)),
      backgroundColor: sorted.value.map((s) =>
        parseFloat(s.totalProfitLoss) >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'
      ),
      yAxisID: 'y',
      order: 1,
    },
    {
      type: 'line' as const,
      label: '損益率',
      data: sorted.value.map((s) => parseFloat(s.totalProfitLossPct)),
      borderColor: '#f59e0b',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.3,
      yAxisID: 'y2',
      order: 0,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  animation: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: { boxWidth: 12, font: { size: 11 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string; yAxisID?: string }; raw: unknown }) => {
          const val = ctx.raw as number
          if (ctx.dataset.yAxisID === 'y2') {
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
          if (Math.abs(v) >= 1_000_000) return `¥${(v / 1_000_000).toFixed(0)}M`
          if (Math.abs(v) >= 10_000) return `¥${(v / 10_000).toFixed(0)}万`
          return `¥${v.toLocaleString()}`
        },
      },
    },
    y2: {
      display: false,
    },
  },
}
</script>
