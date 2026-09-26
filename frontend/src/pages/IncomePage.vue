<template>
  <div>
    <h1 class="mb-4 text-lg font-bold text-gray-800">実現損益・配当</h1>

    <!-- ローディング（初回のみ） -->
    <div v-if="trStore.loading && !trStore.loaded" class="py-8 text-center text-sm text-gray-500">読み込み中...</div>

    <!-- エラー -->
    <div
      v-else-if="trStore.error"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      data-testid="income-error"
    >
      {{ trStore.error }}
    </div>

    <template v-else>
      <!-- 年の選択 -->
      <div class="mb-4 flex flex-wrap gap-2" data-testid="year-selector">
        <button
          v-for="y in years"
          :key="y"
          type="button"
          class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
          :class="y === selectedYear
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'"
          :data-testid="`year-${y}`"
          @click="selectYear(y)"
        >
          {{ y }}
        </button>
      </div>

      <!-- 年間サマリ -->
      <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="実現損益（税引前）"
          :value="f.formatCurrency(String(summary.realizedTotal))"
          :sub-value="`利益 ${summary.gainCount}件／損失 ${summary.lossCount}件`"
          :color-class="f.colorClass(String(summary.realizedTotal))"
        />
        <SummaryCard
          label="受取配当（税引後）"
          :value="f.formatCurrency(String(summary.dividendTotal))"
          :sub-value="`${summary.dividendTickers}銘柄・${summary.dividendPayments}回`"
        />
        <SummaryCard
          label="確定合計"
          :value="f.formatCurrency(String(summary.confirmedTotal))"
          sub-value="実現損益＋受取配当"
          :color-class="f.colorClass(String(summary.confirmedTotal))"
        />
      </div>

      <!-- 一覧 -->
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div class="flex gap-1" role="tablist">
            <button
              v-for="t in sectionTabs"
              :key="t.key"
              type="button"
              role="tab"
              :aria-selected="section === t.key"
              class="rounded px-3 py-1.5 text-sm font-medium transition-colors"
              :class="section === t.key ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
              :data-testid="`section-${t.key}`"
              @click="section = t.key"
            >
              {{ t.label }}
            </button>
          </div>
          <div class="flex items-center gap-1 text-xs text-gray-500">
            <span class="mr-1">表示:</span>
            <button
              v-for="v in viewModes"
              :key="v.key"
              type="button"
              class="rounded border px-2 py-1 transition-colors"
              :class="view === v.key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
              :data-testid="`view-${v.key}`"
              @click="view = v.key"
            >
              {{ v.label }}
            </button>
          </div>
        </div>

        <RealizedTable v-if="section === 'realized'" :trades="trades" :view="view" />
        <DividendTable v-else :rows="dividends" :view="view" />

        <p class="mt-3 text-xs text-gray-400">
          ヘッダをクリックすると並び替えます。
          <template v-if="section === 'realized'">明細は同一の約定日・銘柄・口座の分割約定を1行にまとめています（平均取得単価は数量加重平均）。</template>
        </p>
      </div>

      <p class="mt-3 text-xs text-gray-400">
        ※実現損益は約定日ベース・税引前、配当は税引後（SBIのCSVは税引前を出力しないため）。
        確定申告の参考値です。公式な数値は特定口座年間取引報告書をご確認ください。
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTotalReturnStore } from '@/stores/totalReturnStore'
import {
  availableYears,
  dividendsOfYear,
  mergeExecutions,
  realizedOfYear,
  summarizeYear,
} from '@/lib/incomeHistory'
import { useFormatters } from '@/composables/useFormatters'
import SummaryCard from '@/components/SummaryCard.vue'
import RealizedTable from '@/components/RealizedTable.vue'
import DividendTable from '@/components/DividendTable.vue'

const trStore = useTotalReturnStore()
const route = useRoute()
const router = useRouter()
const f = useFormatters()

const currentYear = new Date().getFullYear()

const years = computed(() => availableYears(trStore.realized, trStore.dividends, currentYear))

// 年は URL の ?year= と連動（資産推移タブの年ごとサマリからのリンク用）。不正値・範囲外は当年。
const selectedYear = computed(() => {
  const y = Number(route.query.year)
  return years.value.includes(y) ? y : currentYear
})

function selectYear(y: number) {
  router.replace({ query: { ...route.query, year: String(y) } })
}

const trades = computed(() => mergeExecutions(realizedOfYear(trStore.realized, selectedYear.value)))
const dividends = computed(() => dividendsOfYear(trStore.dividends, selectedYear.value))
const summary = computed(() => summarizeYear(trades.value, dividends.value))

type Section = 'realized' | 'dividend'
type ViewMode = 'ticker' | 'detail'

const sectionTabs: { key: Section; label: string }[] = [
  { key: 'realized', label: '実現損益' },
  { key: 'dividend', label: '受取配当' },
]
const viewModes: { key: ViewMode; label: string }[] = [
  { key: 'ticker', label: '銘柄別' },
  { key: 'detail', label: '明細' },
]

const section = ref<Section>('realized')
const view = ref<ViewMode>('ticker')
</script>
