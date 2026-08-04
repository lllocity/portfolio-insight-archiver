<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <h3 class="mb-1 text-sm font-semibold text-gray-700">資産・累計損益の推移</h3>
    <p class="mb-3 text-xs text-gray-400">
      面＝総資産（下地＝投下額＋現金、緑＝含み益／赤＝含み損）。折れ線＝累計損益（含み＋実現＋配当）。
    </p>
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
import type { DividendRow, RealizedPnlRow } from '@/types/totalReturn'
import { cumulativeReturnByDate } from '@/lib/totalReturn'

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

const jpy = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })
const fmt = (v: number) => jpy.format(v).replace(/￥/g, '¥')

// 各時点の値を事前計算（絶対値。積み上げは使わず面間塗りで内訳を表現するため、
// 含み損益が負でも 総資産 < 投下額 として正しく描ける）
const rows = computed(() =>
  sorted.value.map((s) => {
    const valuation = parseFloat(s.totalValuation)
    const cash = parseFloat(s.cashBalance)
    const unrealized = parseFloat(s.totalProfitLoss)
    return {
      date: s.snapshotDate,
      base: valuation - unrealized + cash, // 投下額（元本相当）＋現金
      total: valuation + cash, // 総資産 ＝ base + 含み損益
      unrealized,
    }
  }),
)

// 累計損益（含み＋実現＋配当）を各スナップショット時点で算出
const cumReturns = computed(() =>
  cumulativeReturnByDate(
    sorted.value.map((s) => ({ snapshotDate: s.snapshotDate, unrealized: parseFloat(s.totalProfitLoss) })),
    props.realized ?? [],
    props.dividends ?? [],
  ),
)

const chartData = computed(() => ({
  labels: rows.value.map((r) => r.date),
  datasets: [
    {
      // 下地: 投下額（元本＋現金）を 0 まで塗る（資産本体＝薄いグレーで控えめに）
      label: '投下額（元本＋現金）',
      data: rows.value.map((r) => r.base),
      borderColor: '#cbd5e1',
      backgroundColor: 'rgba(148,163,184,0.16)',
      borderWidth: 1,
      pointRadius: 0,
      fill: 'origin' as const,
      order: 3,
    },
    {
      // 含み益（緑）: 投下額を上回る分を投下額ライン（index 0）まで塗る。
      // total<=base（損失）の時は base と一致し帯は消える。
      label: '含み益',
      data: rows.value.map((r) => Math.max(r.total, r.base)),
      borderColor: 'transparent',
      backgroundColor: 'rgba(22,163,74,0.55)',
      borderWidth: 0,
      pointRadius: 0,
      fill: 0 as const,
      order: 2,
    },
    {
      // 含み損（赤）: 投下額を下回る分を投下額ライン（index 0）まで塗る。
      // total>=base（利益）の時は base と一致し帯は消える。
      label: '含み損',
      data: rows.value.map((r) => Math.min(r.total, r.base)),
      borderColor: 'transparent',
      backgroundColor: 'rgba(220,38,38,0.75)',
      borderWidth: 0,
      pointRadius: 0,
      fill: 0 as const,
      order: 2,
    },
    {
      // 累計損益（含み＋実現＋配当）。塗らない独立の折れ線
      label: '累計損益（含み＋実現＋配当）',
      data: rows.value.map((r) => cumReturns.value[r.date] ?? r.unrealized),
      borderColor: '#7c3aed',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.3,
      fill: false,
      order: 0,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  animation: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: { boxWidth: 12, font: { size: 11 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; raw: unknown }) =>
          ` ${ctx.dataset.label}: ${fmt(ctx.raw as number)}`,
        // 含み損益（総資産−投下額）を補足
        afterBody: (items: { dataIndex: number }[]) => {
          const r = rows.value[items[0]?.dataIndex ?? 0]
          return r ? `含み損益: ${fmt(r.unrealized)}` : ''
        },
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, maxTicksLimit: 8 } },
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
      grid: { color: 'rgba(0,0,0,0.06)' },
    },
  },
}))
</script>
