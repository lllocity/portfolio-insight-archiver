<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <!-- ① 資産の推移 -->
    <h3 class="mb-1 text-sm font-semibold text-gray-700">① 資産の推移</h3>
    <p class="mb-2 text-xs text-gray-400">
      面＝総資産（薄い下地＝投下額＋現金、緑＝含み益／赤＝含み損）。
    </p>
    <div class="mb-4" style="height: 220px">
      <Chart type="line" :data="assetData" :options="assetOptions" />
    </div>

    <!-- ② 累計損益の内訳 -->
    <h3 class="mb-1 text-sm font-semibold text-gray-700">② 累計損益の内訳（パフォーマンス）</h3>
    <p class="mb-2 text-xs text-gray-400">
      積み上げ＝累計損益の内訳。含み損益（未確定）＋実現損益（累計）＋受取配当（累計）。
    </p>
    <div style="height: 200px">
      <Chart type="line" :data="perfData" :options="perfOptions" />
    </div>
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
import type { DividendRow, RealizedPnlRow } from '@/types/totalReturn'
import { cumulativeBreakdownByDate } from '@/lib/totalReturn'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
)

const props = defineProps<{
  snapshots: SnapshotListItem[]
  realized?: RealizedPnlRow[]
  dividends?: DividendRow[]
}>()

// 古い→新しい順（左→右）
const sorted = computed(() => [...props.snapshots].reverse())
const labels = computed(() => sorted.value.map((s) => s.snapshotDate))

const jpy = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
const fmt = (v: number) => jpy.format(v).replace(/￥/g, '¥')

// ---- ① 資産パネル用 ----
const assetRows = computed(() =>
  sorted.value.map((s) => {
    const valuation = parseFloat(s.totalValuation)
    const cash = parseFloat(s.cashBalance)
    const unrealized = parseFloat(s.totalProfitLoss)
    return { base: valuation - unrealized + cash, total: valuation + cash, unrealized }
  }),
)

// ---- ② パフォーマンスパネル用（含み／実現累計／配当累計） ----
const breakdown = computed(() =>
  cumulativeBreakdownByDate(
    sorted.value.map((s) => ({ snapshotDate: s.snapshotDate, unrealized: parseFloat(s.totalProfitLoss) })),
    props.realized ?? [],
    props.dividends ?? [],
  ),
)

// 共通: y軸フォーマット・幅（2パネルのx位置を揃える）
const yTick = (value: number | string) => {
  const v = Number(value)
  if (Math.abs(v) >= 1_000_000) return `¥${(v / 1_000_000).toFixed(0)}M`
  if (Math.abs(v) >= 10_000) return `¥${(v / 10_000).toFixed(0)}万`
  return `¥${v.toLocaleString()}`
}
const fixYWidth = { afterFit: (scale: { width: number }) => { scale.width = 56 } }

const assetData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: '投下額（元本＋現金）',
      data: assetRows.value.map((r) => r.base),
      borderColor: '#cbd5e1',
      backgroundColor: 'rgba(148,163,184,0.16)',
      borderWidth: 1,
      pointRadius: 0,
      fill: 'origin' as const,
      order: 3,
    },
    {
      label: '含み益',
      data: assetRows.value.map((r) => Math.max(r.total, r.base)),
      borderColor: 'transparent',
      backgroundColor: 'rgba(22,163,74,0.55)',
      borderWidth: 0,
      pointRadius: 0,
      fill: 0 as const,
      order: 2,
    },
    {
      label: '含み損',
      data: assetRows.value.map((r) => Math.min(r.total, r.base)),
      borderColor: 'transparent',
      backgroundColor: 'rgba(220,38,38,0.75)',
      borderWidth: 0,
      pointRadius: 0,
      fill: 0 as const,
      order: 2,
    },
  ],
}))

const assetOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: {
      filter: (item: { dataset: { label?: string } }) => item.dataset.label === '投下額（元本＋現金）',
      callbacks: {
        label: (ctx: { raw: unknown }) => ` 投下額（元本＋現金）: ${fmt(ctx.raw as number)}`,
        afterBody: (items: { dataIndex: number }[]) => {
          const r = assetRows.value[items[0]?.dataIndex ?? 0]
          if (!r) return ''
          const sign = r.unrealized >= 0 ? '+' : ''
          return [`総資産: ${fmt(r.total)}`, `含み損益: ${sign}${fmt(r.unrealized)}`]
        },
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, maxTicksLimit: 8 } },
    y: { ...fixYWidth, ticks: { font: { size: 10 }, callback: yTick }, grid: { color: 'rgba(0,0,0,0.06)' } },
  },
}))

// 累計損益の内訳（積み上げ面）。下→上＝含み・実現・配当（隣接色のCVD分離を確保）
const perfData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: '含み損益（未確定）',
      data: breakdown.value.map((b) => b.unrealized),
      borderColor: '#16a34a',
      backgroundColor: 'rgba(22,163,74,0.55)',
      borderWidth: 1,
      pointRadius: 0,
      fill: true,
      order: 2,
    },
    {
      label: '実現損益（累計）',
      data: breakdown.value.map((b) => b.realizedCum),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.50)',
      borderWidth: 1,
      pointRadius: 0,
      fill: true,
      order: 1,
    },
    {
      label: '受取配当（累計）',
      data: breakdown.value.map((b) => b.dividendCum),
      borderColor: '#d97706',
      backgroundColor: 'rgba(217,119,6,0.55)',
      borderWidth: 1,
      pointRadius: 0,
      fill: true,
      order: 0,
    },
  ],
}))

const perfOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; raw: unknown }) => ` ${ctx.dataset.label}: ${fmt(ctx.raw as number)}`,
        afterBody: (items: { dataIndex: number }[]) => {
          const b = breakdown.value[items[0]?.dataIndex ?? 0]
          return b ? `累計損益 計: ${fmt(b.total)}` : ''
        },
      },
    },
  },
  scales: {
    x: { stacked: true, ticks: { font: { size: 10 }, maxTicksLimit: 8 } },
    y: { ...fixYWidth, stacked: true, ticks: { font: { size: 10 }, callback: yTick }, grid: { color: 'rgba(0,0,0,0.06)' } },
  },
}))
</script>
