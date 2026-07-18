<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">推移グラフ</h3>
    <Chart type="line" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Chart } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import type { SnapshotListItem } from '@/types/portfolio'

ChartJS.register(CategoryScale, LinearScale, LineController, PointElement, LineElement, Filler, Tooltip, Legend)

const props = defineProps<{ snapshots: SnapshotListItem[] }>()

const sorted = computed(() => [...props.snapshots].reverse())

const jpy = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })

const chartData = computed(() => ({
  labels: sorted.value.map((s) => s.snapshotDate),
  datasets: [
    {
      label: '現金',
      data: sorted.value.map((s) => parseFloat(s.cashBalance)),
      fill: true,
      backgroundColor: 'rgba(59,130,246,0.75)',
      borderColor: 'rgba(59,130,246,0.9)',
      borderWidth: 1,
      pointRadius: 0,
      tension: 0.3,
      yAxisID: 'y',
      order: 1,
    },
    {
      label: '株式評価額',
      data: sorted.value.map((s) => parseFloat(s.totalValuation)),
      fill: true,
      backgroundColor: 'rgba(239,68,68,0.65)',
      borderColor: 'rgba(239,68,68,0.8)',
      borderWidth: 1,
      pointRadius: 0,
      tension: 0.3,
      yAxisID: 'y',
      order: 2,
    },
    {
      label: '損益率',
      data: sorted.value.map((s) => parseFloat(s.totalProfitLossPct)),
      fill: false,
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
      labels: {
        boxWidth: 12,
        font: { size: 11 },
        filter: (item: { text: string }) => item.text !== '損益率',
      },
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
      stacked: true,
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
      stacked: false,
    },
  },
}
</script>
