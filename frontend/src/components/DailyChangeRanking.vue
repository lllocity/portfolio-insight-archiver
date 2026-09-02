<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <h3 class="mb-1 text-sm font-semibold text-gray-700">日次騰落率ランキング</h3>
    <p class="mb-3 text-xs text-gray-400">
      各スナップショット日の前日比を評価額で加重して集計。ヘッダをクリックすると並び替えます。
    </p>

    <!-- ローディング -->
    <div v-if="loading" class="py-6 text-center text-sm text-gray-400">読み込み中...</div>

    <!-- エラー -->
    <div v-else-if="error" class="text-xs text-red-600">{{ error }}</div>

    <!-- データなし -->
    <div v-else-if="rows.length === 0" class="text-sm text-gray-500">
      集計対象のデータがありません。
    </div>

    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-full text-sm" data-testid="change-ranking">
          <thead class="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th scope="col" class="px-3 py-2 text-left font-medium">日付</th>
              <th
                scope="col"
                class="cursor-pointer select-none px-3 py-2 text-right font-medium hover:text-gray-700"
                data-testid="sort-pct"
                @click="setSort('pct')"
              >
                騰落率{{ sortIndicator('pct') }}
              </th>
              <th
                scope="col"
                class="cursor-pointer select-none px-3 py-2 text-right font-medium hover:text-gray-700"
                data-testid="sort-amount"
                @click="setSort('amount')"
              >
                騰落幅{{ sortIndicator('amount') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(r, i) in displayedRows" :key="r.snapshotDate" data-testid="change-row">
              <td class="px-3 py-2 font-medium">
                <span class="mr-1 text-xs text-gray-400">{{ i + 1 }}.</span>{{ r.snapshotDate }}
              </td>
              <td class="px-3 py-2 text-right" :class="f.colorClass(String(r.changePct))">
                {{ f.formatPct(String(r.changePct)) }}
              </td>
              <td class="px-3 py-2 text-right" :class="f.colorClass(String(r.changeAmount))">
                {{ f.formatCurrency(String(r.changeAmount)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- もっと見る -->
      <div v-if="sortedRows.length > displayCount" class="mt-3 text-center">
        <button
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs text-gray-600 hover:bg-gray-50"
          @click="displayCount += 30"
        >
          もっと見る（残り {{ sortedRows.length - displayCount }} 件）
        </button>
      </div>

      <p class="mt-3 text-xs text-gray-400">
        ※投資信託は前日比の単位系が異なるため集計対象外。前日比はSBIのCSV値に基づく市場の値動きで、入出金・売買は含みません。
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchDailyChangeRanking } from '@/api/changeRankingApi'
import type { DailyChange } from '@/api/changeRankingApi'
import { sortRanking } from '@/lib/changeRanking'
import type { SortKey, SortDir } from '@/lib/changeRanking'
import { useFormatters } from '@/composables/useFormatters'

const f = useFormatters()

const rows = ref<DailyChange[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const sortKey = ref<SortKey>('pct')
const sortDir = ref<SortDir>('desc')
const displayCount = ref(30)

const sortedRows = computed(() => sortRanking(rows.value, sortKey.value, sortDir.value))
const displayedRows = computed(() => sortedRows.value.slice(0, displayCount.value))

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
  displayCount.value = 30
}

function sortIndicator(key: SortKey): string {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'desc' ? ' ▼' : ' ▲'
}

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    rows.value = await fetchDailyChangeRanking()
  } catch {
    error.value = '騰落率ランキングの取得に失敗しました'
  } finally {
    loading.value = false
  }
})
</script>
