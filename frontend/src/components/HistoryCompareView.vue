<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">スナップショット比較</h3>

    <div v-if="dates.length <= 1" class="text-sm text-gray-500">
      比較対象のスナップショットがありません
    </div>

    <template v-else>
      <!-- 日付選択 -->
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <select
          v-model="fromDate"
          class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option v-for="d in dates" :key="d.snapshotDate" :value="d.snapshotDate">
            {{ d.snapshotDate }}
          </option>
        </select>
        <span class="text-xs text-gray-400">→</span>
        <select
          v-model="toDate"
          class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option v-for="d in dates" :key="d.snapshotDate" :value="d.snapshotDate">
            {{ d.snapshotDate }}
          </option>
        </select>
      </div>

      <!-- エラー -->
      <div v-if="error" class="mb-3 text-xs text-red-600">{{ error }}</div>

      <!-- セクターチャート2枚 -->
      <div v-if="loading" class="py-8 text-center text-sm text-gray-400">読み込み中...</div>
      <div v-else class="grid gap-4 md:grid-cols-2">
        <SectorChart v-if="fromSectors.length" :sectors="fromSectors" :title="fromDate" />
        <SectorChart v-if="toSectors.length" :sectors="toSectors" :title="toDate" />
      </div>

      <!-- 売買銘柄 -->
      <div v-if="diff && (diff.addedTickers.length > 0 || diff.removedTickers.length > 0 || diff.changedTickers.length > 0)" class="mt-4 space-y-2">
        <div v-if="diff.addedTickers.length > 0">
          <p class="mb-1 text-xs font-medium text-gray-500">新規購入</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="t in diff.addedTickers"
              :key="t.tickerCode"
              class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
            >
              +{{ t.tickerCode }}<template v-if="t.companyName"> {{ t.companyName }}</template> {{ t.totalQuantity }}株
            </span>
          </div>
        </div>
        <div v-if="diff.changedTickers.filter(t => t.quantityDiff > 0).length > 0">
          <p class="mb-1 text-xs font-medium text-gray-500">買い足し</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="t in diff.changedTickers.filter(t => t.quantityDiff > 0)"
              :key="t.tickerCode"
              class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
            >
              +{{ t.tickerCode }}<template v-if="t.companyName"> {{ t.companyName }}</template> +{{ t.quantityDiff }}株 (計{{ t.toQuantity }}株)
            </span>
          </div>
        </div>
        <div v-if="diff.changedTickers.filter(t => t.quantityDiff < 0).length > 0">
          <p class="mb-1 text-xs font-medium text-gray-500">一部売却</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="t in diff.changedTickers.filter(t => t.quantityDiff < 0)"
              :key="t.tickerCode"
              class="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"
            >
              {{ t.tickerCode }}<template v-if="t.companyName"> {{ t.companyName }}</template> {{ t.quantityDiff }}株 (計{{ t.toQuantity }}株)
            </span>
          </div>
        </div>
        <div v-if="diff.removedTickers.length > 0">
          <p class="mb-1 text-xs font-medium text-gray-500">全売却</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="t in diff.removedTickers"
              :key="t.tickerCode"
              class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
            >
              -{{ t.tickerCode }}<template v-if="t.companyName"> {{ t.companyName }}</template> {{ t.totalQuantity }}株
            </span>
          </div>
        </div>
      </div>
      <div v-else-if="diff" class="mt-4 text-xs text-gray-400">この期間に売買なし</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import SectorChart from '@/components/SectorChart.vue'
import { fetchSnapshotDates, fetchSnapshotSectors, fetchSnapshotDiff } from '@/api/portfolioApi'
import type { SnapshotListItem, SectorAllocation, SnapshotDiff } from '@/types/portfolio'

const dates = ref<SnapshotListItem[]>([])
const fromDate = ref('')
const toDate = ref('')
const fromSectors = ref<SectorAllocation[]>([])
const toSectors = ref<SectorAllocation[]>([])
const diff = ref<SnapshotDiff | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function loadComparison(from: string, to: string) {
  loading.value = true
  error.value = null
  try {
    const [fs, ts, d] = await Promise.all([
      fetchSnapshotSectors(from),
      fetchSnapshotSectors(to),
      fetchSnapshotDiff(from, to)
    ])
    fromSectors.value = fs
    toSectors.value = ts
    diff.value = d
  } catch {
    error.value = 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  dates.value = await fetchSnapshotDates()
  if (dates.value.length >= 2) {
    toDate.value = dates.value[0].snapshotDate
    fromDate.value = dates.value[1].snapshotDate
    await loadComparison(fromDate.value, toDate.value)
  }
})

watch([fromDate, toDate], ([from, to]) => {
  if (!from || !to || from === to) return
  loadComparison(from, to)
})
</script>
