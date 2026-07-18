<template>
  <div>
    <h1 class="mb-4 text-lg font-bold text-gray-800">スナップショット履歴</h1>

    <!-- ローディング -->
    <div v-if="loading" class="py-8 text-center text-sm text-gray-500">読み込み中...</div>

    <!-- データなし -->
    <div
      v-else-if="snapshots.length === 0"
      class="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500"
    >
      スナップショットがまだありません。
    </div>

    <template v-else>
      <!-- 推移グラフ -->
      <SnapshotTrendChart class="mb-6" :snapshots="snapshots" />

      <p class="mb-3 text-xs text-gray-500">
        行をクリックすると保有銘柄を展開します。
      </p>

      <!-- スナップショット一覧 -->
      <div class="mb-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-sm" data-testid="snapshot-list">
          <thead class="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th scope="col" class="px-3 py-2 text-left font-medium">日付</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">総資産</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">株式評価額</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">損益</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">損益率</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">銘柄数</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-for="s in displayedSnapshots" :key="s.snapshotDate">
              <!-- スナップショット行 -->
              <tr
                data-testid="snapshot-row"
                class="cursor-pointer hover:bg-gray-50"
                @click="toggleExpand(s.snapshotDate)"
              >
                <td class="px-3 py-2 font-medium">
                  <span class="mr-1 text-xs text-gray-400">{{ expandedDate === s.snapshotDate ? '▲' : '▼' }}</span>
                  {{ s.snapshotDate }}
                </td>
                <td class="px-3 py-2 text-right">{{ f.formatCurrency(String(parseFloat(s.totalValuation) + parseFloat(s.cashBalance))) }}</td>
                <td class="px-3 py-2 text-right text-gray-500">{{ f.formatCurrency(s.totalValuation) }}</td>
                <td class="px-3 py-2 text-right" :class="f.colorClass(s.totalProfitLoss)">
                  {{ f.formatCurrency(s.totalProfitLoss) }}
                </td>
                <td class="px-3 py-2 text-right" :class="f.colorClass(s.totalProfitLossPct)">
                  {{ f.formatPct(s.totalProfitLossPct) }}
                </td>
                <td class="px-3 py-2 text-right text-gray-500">{{ s.holdingCount }}</td>
              </tr>

              <!-- アコーディオン: 保有銘柄 -->
              <tr v-if="expandedDate === s.snapshotDate">
                <td colspan="6" class="bg-gray-50 p-0">
                  <div class="px-4 py-3">
                    <div v-if="holdingsLoading[s.snapshotDate]" class="py-2 text-center text-xs text-gray-500">
                      読み込み中...
                    </div>
                    <div v-else-if="holdingsError[s.snapshotDate]" class="text-xs text-red-600">
                      {{ holdingsError[s.snapshotDate] }}
                    </div>
                    <table v-else-if="holdingsCache[s.snapshotDate]?.length" class="w-full text-xs">
                      <thead class="text-gray-500">
                        <tr>
                          <th class="pb-1 text-left font-medium">銘柄コード</th>
                          <th class="pb-1 text-left font-medium">企業名</th>
                          <th class="pb-1 text-left font-medium">セクター</th>
                          <th class="pb-1 text-right font-medium">数量</th>
                          <th class="pb-1 text-right font-medium">現在値</th>
                          <th class="pb-1 text-right font-medium">前日比</th>
                          <th class="pb-1 text-right font-medium">評価額</th>
                          <th class="pb-1 text-right font-medium">損益</th>
                          <th class="pb-1 text-right font-medium">損益率</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100">
                        <tr v-for="h in holdingsCache[s.snapshotDate]" :key="h.tickerCode">
                          <td class="py-1 font-mono">{{ h.tickerCode }}</td>
                          <td class="py-1">{{ h.companyName ?? '-' }}</td>
                          <td class="py-1 text-gray-500">{{ h.sector33Name ?? '-' }}</td>
                          <td class="py-1 text-right">{{ h.totalQuantity }}</td>
                          <td class="py-1 text-right">{{ f.formatCurrency(h.currentPrice) }}</td>
                          <td class="py-1 text-right" :class="f.colorClass(h.dailyChange)">
                            {{ f.formatPct(h.dailyChangePct) }}
                          </td>
                          <td class="py-1 text-right">{{ f.formatCurrency(h.totalValuation) }}</td>
                          <td class="py-1 text-right" :class="f.colorClass(h.totalProfitLoss)">
                            {{ f.formatCurrency(h.totalProfitLoss) }}
                          </td>
                          <td class="py-1 text-right" :class="f.colorClass(h.totalProfitLossPct)">
                            {{ f.formatPct(h.totalProfitLossPct) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- もっと見る -->
      <div v-if="snapshots.length > displayCount" class="mb-6 text-center">
        <button
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          @click="displayCount += 30"
        >
          もっと見る（残り {{ snapshots.length - displayCount }} 件）
        </button>
      </div>

      <!-- スナップショット比較 -->
      <HistoryCompareView />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchSnapshotDates } from '@/api/portfolioApi'
import { fetchSnapshotHoldings } from '@/api/snapshotHoldingsApi'
import type { SnapshotHolding } from '@/api/snapshotHoldingsApi'
import { useFormatters } from '@/composables/useFormatters'
import type { SnapshotListItem } from '@/types/portfolio'
import HistoryCompareView from '@/components/HistoryCompareView.vue'
import SnapshotTrendChart from '@/components/SnapshotTrendChart.vue'

const f = useFormatters()
const snapshots = ref<SnapshotListItem[]>([])
const loading = ref(false)
const displayCount = ref(30)
const displayedSnapshots = computed(() => snapshots.value.slice(0, displayCount.value))

// アコーディオン
const expandedDate = ref<string | null>(null)
const holdingsCache = ref<Record<string, SnapshotHolding[]>>({})
const holdingsLoading = ref<Record<string, boolean>>({})
const holdingsError = ref<Record<string, string>>({})

onMounted(async () => {
  loading.value = true
  try {
    snapshots.value = await fetchSnapshotDates()
  } finally {
    loading.value = false
  }
})

async function toggleExpand(date: string) {
  if (expandedDate.value === date) {
    expandedDate.value = null
    return
  }
  expandedDate.value = date
  if (holdingsCache.value[date]) return
  holdingsLoading.value[date] = true
  holdingsError.value[date] = ''
  try {
    holdingsCache.value[date] = await fetchSnapshotHoldings(date)
  } catch {
    holdingsError.value[date] = '保有銘柄の取得に失敗しました'
  } finally {
    holdingsLoading.value[date] = false
  }
}
</script>
