<template>
  <div>
    <h1 class="mb-4 text-lg font-bold text-gray-800">ポートフォリオ</h1>

    <!-- CSVインポートフォーム -->
    <div class="mb-6">
      <CsvImportForm @imported="onImported" />
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
      <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="総評価額"
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
          label="年間配当合計（推定）"
          :value="totalEstimatedAnnualDividend > 0 ? f.formatCurrency(String(totalEstimatedAnnualDividend)) : '―'"
          sub-value="会社予想・遅延あり"
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

      <!-- 差分ビュー -->
      <div>
        <DiffView :diff="store.data.diff" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { useFormatters } from '@/composables/useFormatters'
import CsvImportForm from '@/components/CsvImportForm.vue'
import SummaryCard from '@/components/SummaryCard.vue'
import SectorChart from '@/components/SectorChart.vue'
import HoldingsTable from '@/components/HoldingsTable.vue'
import DiffView from '@/components/DiffView.vue'

const store = usePortfolioStore()
const f = useFormatters()

const totalEstimatedAnnualDividend = computed(() =>
  (store.data?.holdings ?? [])
    .reduce((sum, h) => sum + (h.estimatedAnnualDividend ? parseFloat(h.estimatedAnnualDividend) : 0), 0)
)

async function onImported() {
  await store.reload()
}
</script>
