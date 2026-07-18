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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
)

const props = defineProps<{ snapshots: SnapshotListItem[] }>()

const sorted = computed(() => [...props.snapshots].reverse())

const jpy = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })

const chartData = computed(() => ({
  labels: sorted.value.map((s) => s.snapshotDate),
  datasets: [
    {
      type: 'line' as const,
      label: '総資産',
      data: sorted.value.map((s) => parseFloat(s.totalValuation) + parseFloat(s.cashBalance)),
      borderColor: '#2563eb',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.3,
      yAxisID: 'yLeft',
      order: 0,
    },
    {
      type: 'bar' as const,
      label: '損益',
      data: sorted.value.map((s) => parseFloat(s.totalProfitLoss)),
      backgroundColor: sorted.value.map((s) =>
        parseFloat(s.totalProfitLoss) >= 0 ? 'rgba(34,197,94,0.75)' : 'rgba(239,68,68,0.75)',
      ),
      borderColor: sorted.value.map((s) =>
        parseFloat(s.totalProfitLoss) >= 0 ? 'rgba(34,197,94,1)' : 'rgba(239,68,68,1)',
      ),
      borderWidth: 1,
      yAxisID: 'yRight',
      order: 1,
    },
  ],
}))

const chartOptions = computed(() => ({
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
        label: (ctx: { dataset: { label?: string; yAxisID?: string }; dataIndex: number; raw: unknown }) => {
          const val = ctx.raw as number
          const pct = parseFloat(sorted.value[ctx.dataIndex]?.totalProfitLossPct ?? '0')
          const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'

          if (ctx.dataset.yAxisID === 'yRight') {
            return ` ${ctx.dataset.label}: ${jpy.format(val).replace(/￥/g, '¥')} (${pctStr})`
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
    yLeft: {
      position: 'left' as const,
      ticks: {
        font: { size: 10 },
        callback: (value: number | string) => {
          const v = Number(value)
          if (Math.abs(v) >= 1_000_000) return `¥${(v / 1_000_000).toFixed(0)}M`
          if (Math.abs(v) >= 10_000) return `¥${(v / 10_000).toFixed(0)}万`
          return `¥${v.toLocaleString()}`
        },
      },
      grid: { color: 'rgba(0,0,0,0.06)' },
    },
    yRight: {
      position: 'right' as const,
      ticks: {
        font: { size: 10 },
        callback: (value: number | string) => {
          const v = Number(value)
          if (Math.abs(v) >= 1_000_000) return `¥${(v / 1_000_000).toFixed(0)}M`
          if (Math.abs(v) >= 10_000) return `¥${(v / 10_000).toFixed(0)}万`
          return `¥${v.toLocaleString()}`
        },
      },
      grid: { drawOnChartArea: false },
    },
  },
}))
</script>
