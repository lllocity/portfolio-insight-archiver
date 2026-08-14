<template>
  <div>
    <h1 class="mb-4 text-lg font-bold text-gray-800">ポートフォリオ</h1>

    <!-- CSVインポート（保有証券 / 実現損益・配当）を横並び2カラム -->
    <div class="mb-6 grid gap-4 lg:grid-cols-2 lg:items-start">
      <CsvImportForm @imported="onImported" />
      <RealizedDividendImportForm @imported="onTotalReturnImported" />
    </div>

    <!-- エラー -->
    <div v-if="store.error" class="mb-4 rounded bg-red-50 p-3 text-xs text-red-700" data-testid="portfolio-error">
      {{ store.error }}
    </div>

    <!-- ローディング -->
    <div v-if="store.loading" class="flex justify-center py-12" data-testid="portfolio-loading">
      <span class="text-sm text-gray-500">読み込み中...</span>
    </div>

    <!-- データなし -->
    <div
      v-else-if="!store.data"
      class="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500"
      data-testid="portfolio-empty"
    >
      まだデータがありません。CSVをインポートしてください。
    </div>

    <template v-else>
      <!-- サマリーカード -->
      <div class="mb-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          label="総資産"
          :value="f.formatCurrency(totalAssets)"
          :sub-value="store.data.snapshot.cashBalance !== '0' ? `うち待機資金 ${f.formatCurrency(store.data.snapshot.cashBalance)}` : undefined"
        />
        <SummaryCard
          label="株式評価額"
          :value="f.formatCurrency(store.data.snapshot.totalValuation)"
        />
        <SummaryCard
          label="総損益"
          :value="f.formatCurrency(store.data.snapshot.totalProfitLoss)"
          :sub-value="`（${f.formatPct(store.data.snapshot.totalProfitLossPct)}）`"
          :color-class="f.colorClass(store.data.snapshot.totalProfitLoss)"
        />
        <SummaryCard
          label="保有銘柄数"
          :value="`${store.data.snapshot.holdingCount} 銘柄`"
          :sub-value="store.data.snapshot.snapshotDate"
        />
        <SummaryCard
          label="年間配当合計（予想）"
          :value="totalAnnualDividend !== null ? f.formatCurrency(totalAnnualDividend) : '-'"
          :sub-value="dividendYield ?? undefined"
        />
      </div>

      <!-- 年間トータルリターン（当年実現＋当年配当＋現在含み） -->
      <div class="mb-6">
        <TotalReturnPanel
          :title="`年間トータルリターン（${currentYear}年）`"
          :subtitle="`${currentYear}/01/01〜${todayStr} 時点`"
          note="※含み損益は現在の全保有分です。年初からの含みも含むため、当年の成果としてはやや上振れします。"
          :unrealized="annual.unrealized"
          :realized="annual.realizedTotal"
          :dividend="annual.dividendTotal"
          :labels="annualLabels"
          :error="trStore.error"
        />
      </div>

      <!-- セクターグラフ -->
      <div class="mb-6">
        <SectorChart :sectors="store.data.sectors" />
      </div>

      <!-- 保有銘柄テーブル -->
      <div class="mb-6">
        <h2 class="mb-2 text-sm font-semibold text-gray-700">保有銘柄一覧</h2>
        <HoldingsTable :holdings="store.data.holdings" :sectors="store.data.sectors" />
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { useTotalReturnStore } from '@/stores/totalReturnStore'
import { annualReturn } from '@/lib/totalReturn'
import { useFormatters } from '@/composables/useFormatters'
import CsvImportForm from '@/components/CsvImportForm.vue'
import RealizedDividendImportForm from '@/components/RealizedDividendImportForm.vue'
import SummaryCard from '@/components/SummaryCard.vue'
import TotalReturnPanel from '@/components/TotalReturnPanel.vue'
import SectorChart from '@/components/SectorChart.vue'
import HoldingsTable from '@/components/HoldingsTable.vue'

const store = usePortfolioStore()
const trStore = useTotalReturnStore()
const f = useFormatters()

// 含み損益（未実現）= 現在スナップショットの総損益
const unrealized = computed<number | null>(() =>
  store.data ? parseFloat(store.data.snapshot.totalProfitLoss) : null,
)

// 年間トータルリターン（当年実現＋当年配当＋現在含み）
const currentYear = new Date().getFullYear()
const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
const annual = computed(() =>
  annualReturn(trStore.realized, trStore.dividends, currentYear, unrealized.value ?? 0),
)
const annualLabels = {
  unrealized: { label: '含み損益（現在）', subValue: '現在の保有分' },
  realized: { label: '実現損益（当年・税引前）', subValue: '売却で確定' },
  dividend: { label: '受取配当（当年・税引後）', subValue: '入金済み' },
}

const totalAssets = computed<string>(() => {
  if (!store.data) return '0'
  const valuation = parseFloat(store.data.snapshot.totalValuation)
  const cash = parseFloat(store.data.snapshot.cashBalance)
  return String(valuation + cash)
})

const totalAnnualDividend = computed<string | null>(() => {
  if (!store.data) return null
  const total = store.data.holdings
    .map(h => parseFloat(h.estimatedAnnualDividend ?? '0'))
    .reduce((a, b) => a + b, 0)
  return total > 0 ? total.toString() : null
})

const dividendYield = computed<string | null>(() => {
  if (!store.data || totalAnnualDividend.value === null) return null
  const assets = parseFloat(totalAssets.value)
  if (assets === 0) return null
  const pct = (parseFloat(totalAnnualDividend.value) / assets * 100).toFixed(2)
  return `配当利回り ${pct}%`
})

async function onImported() {
  await store.reload()
}

async function onTotalReturnImported() {
  await trStore.reload()
}
</script>
