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
      <p class="mb-3 text-xs text-gray-500">
        行をクリックすると保有銘柄を展開します。チェックボックスで2つ選択すると差分を表示します（3つ目を選択すると最初の選択が解除されます）
      </p>

      <!-- スナップショット一覧 -->
      <div class="mb-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-sm" data-testid="snapshot-list">
          <thead class="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th scope="col" class="w-8 px-3 py-2"></th>
              <th scope="col" class="px-3 py-2 text-left font-medium">日付</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">総評価額</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">損益</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">損益率</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">銘柄数</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-for="s in snapshots" :key="s.snapshotDate">
              <!-- スナップショット行 -->
              <tr
                data-testid="snapshot-row"
                class="cursor-pointer hover:bg-gray-50"
                :class="{ 'bg-blue-50': selectedDates.includes(s.snapshotDate) }"
                @click="toggleExpand(s.snapshotDate)"
              >
                <td class="px-3 py-2" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedDates.includes(s.snapshotDate)"
                    class="rounded"
                    :data-testid="`snapshot-checkbox-${s.snapshotDate}`"
                    @change="toggleSelect(s.snapshotDate)"
                  />
                </td>
                <td class="px-3 py-2 font-medium">
                  <span class="mr-1 text-xs text-gray-400">{{ expandedDate === s.snapshotDate ? '▲' : '▼' }}</span>
                  {{ s.snapshotDate }}
                </td>
                <td class="px-3 py-2 text-right">{{ f.formatCurrency(s.totalValuation) }}</td>
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

      <!-- 差分エリア -->
      <div>
        <p v-if="selectedDates.length < 2" class="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          2つのスナップショットを選択してください
        </p>
        <div v-else-if="diffLoading" class="py-4 text-center text-sm text-gray-500">
          差分を計算中...
        </div>
        <div v-else-if="diffError" class="rounded bg-red-50 p-3 text-xs text-red-700">
          {{ diffError }}
        </div>
        <div v-else-if="diff">
          <p class="mb-2 text-xs text-gray-500">
            比較: {{ fromDate }} → {{ toDate }}
          </p>
          <DiffView :diff="diff" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { fetchSnapshots, fetchSnapshotDiff } from '@/api/snapshotApi'
import { fetchSnapshotHoldings } from '@/api/snapshotHoldingsApi'
import type { SnapshotHolding } from '@/api/snapshotHoldingsApi'
import { useFormatters } from '@/composables/useFormatters'
import DiffView from '@/components/DiffView.vue'
import type { SnapshotListItem } from '@/types/snapshot'
import type { SnapshotDiff } from '@/types/portfolio'

const f = useFormatters()
const snapshots = ref<SnapshotListItem[]>([])
const loading = ref(false)
const selectedDates = ref<string[]>([])
const diff = ref<SnapshotDiff | null>(null)
const diffLoading = ref(false)
const diffError = ref<string | null>(null)

// アコーディオン
const expandedDate = ref<string | null>(null)
const holdingsCache = ref<Record<string, SnapshotHolding[]>>({})
const holdingsLoading = ref<Record<string, boolean>>({})
const holdingsError = ref<Record<string, string>>({})

const fromDate = computed(() =>
  selectedDates.value.length === 2
    ? [...selectedDates.value].sort()[0]
    : ''
)
const toDate = computed(() =>
  selectedDates.value.length === 2
    ? [...selectedDates.value].sort()[1]
    : ''
)

onMounted(async () => {
  loading.value = true
  try {
    snapshots.value = await fetchSnapshots()
  } finally {
    loading.value = false
  }
})

function toggleSelect(date: string) {
  const idx = selectedDates.value.indexOf(date)
  if (idx >= 0) {
    selectedDates.value.splice(idx, 1)
  } else if (selectedDates.value.length < 2) {
    selectedDates.value.push(date)
  } else {
    selectedDates.value = [selectedDates.value[1], date]
  }
}

async function toggleExpand(date: string) {
  if (expandedDate.value === date) {
    expandedDate.value = null
    return
  }
  expandedDate.value = date
  if (holdingsCache.value[date]) return  // キャッシュ済みなら再フェッチしない
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

watch(
  () => [...selectedDates.value],
  async (dates) => {
    if (dates.length !== 2) {
      diff.value = null
      return
    }
    diffLoading.value = true
    diffError.value = null
    try {
      diff.value = await fetchSnapshotDiff(fromDate.value, toDate.value)
    } catch (e: unknown) {
      diffError.value = (e as { message?: string })?.message ?? '差分の取得に失敗しました'
    } finally {
      diffLoading.value = false
    }
  }
)
</script>
