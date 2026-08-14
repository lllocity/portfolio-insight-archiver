<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <!-- ① 総資産の推移（エクイティカーブ） -->
    <h3 class="mb-1 text-sm font-semibold text-gray-700">① 総資産の推移</h3>
    <p class="mb-2 text-xs text-gray-400">
      折れ線＝総資産（青の面）。破線＝投下額（元本＋現金）。両者の差が含み損益。
    </p>
    <div class="mb-4" style="height: 220px">
      <Chart type="line" :data="assetData" :options="assetOptions" />
    </div>

    <!-- ② 累計損益の推移（0基準） -->
    <h3 class="mb-1 text-sm font-semibold text-gray-700">② 累計損益の推移</h3>
    <p class="mb-2 text-xs text-gray-400">
      含み＋実現＋配当の累計。0を境にプラス＝緑・マイナス＝赤。（内訳は下の年サマリ表・上部パネル参照）
    </p>
    <div style="height: 180px">
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

// ---- ① 資産パネル（総資産・投下額） ----
const assetRows = computed(() =>
  sorted.value.map((s) => {
    const valuation = parseFloat(s.totalValuation)
    const cash = parseFloat(s.cashBalance)
    const unrealized = parseFloat(s.totalProfitLoss)
    return { base: valuation - unrealized + cash, total: valuation + cash, unrealized }
  }),
)

// ---- ② 累計損益（含み＋実現累計＋配当累計の合計） ----
const cumTotals = computed(() =>
  cumulativeBreakdownByDate(
    sorted.value.map((s) => ({ snapshotDate: s.snapshotDate, unrealized: parseFloat(s.totalProfitLoss) })),
    props.realized ?? [],
    props.dividends ?? [],
  ).map((b) => b.total),
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
      label: '総資産',
      data: assetRows.value.map((r) => r.total),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.10)',
      borderWidth: 2,
      pointRadius: 0,
      fill: 'origin' as const,
      order: 1,
    },
    {
      label: '投下額（元本＋現金）',
      data: assetRows.value.map((r) => r.base),
      borderColor: '#94a3b8',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [4, 3],
      pointRadius: 0,
      fill: false,
      order: 0,
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
      callbacks: {
        label: (ctx: { dataset: { label?: string }; raw: unknown }) => ` ${ctx.dataset.label}: ${fmt(ctx.raw as number)}`,
        afterBody: (items: { dataIndex: number }[]) => {
          const r = assetRows.value[items[0]?.dataIndex ?? 0]
          if (!r) return ''
          const sign = r.unrealized >= 0 ? '+' : ''
          return `含み損益: ${sign}${fmt(r.unrealized)}`
        },
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, maxTicksLimit: 8 } },
    y: { ...fixYWidth, ticks: { font: { size: 10 }, callback: yTick }, grid: { color: 'rgba(0,0,0,0.06)' } },
  },
}))

// 累計損益カーブ（0基準・プラス緑/マイナス赤の面）
const perfData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: '累計損益（含み＋実現＋配当）',
      data: cumTotals.value,
      borderColor: '#475569',
      borderWidth: 2,
      pointRadius: 0,
      fill: { target: 'origin' as const, above: 'rgba(22,163,74,0.35)', below: 'rgba(220,38,38,0.35)' },
    },
  ],
}))

const perfOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { raw: unknown }) => ` 累計損益: ${fmt(ctx.raw as number)}`,
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, maxTicksLimit: 8 } },
    y: { ...fixYWidth, ticks: { font: { size: 10 }, callback: yTick }, grid: { color: 'rgba(0,0,0,0.06)' } },
  },
}))
</script>
