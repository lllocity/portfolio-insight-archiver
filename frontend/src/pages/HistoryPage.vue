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
        2つのスナップショットを選択すると差分を表示します（3つ目を選択すると最初の選択が解除されます）
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
            <tr
              v-for="s in snapshots"
              :key="s.snapshotDate"
              data-testid="snapshot-row"
              class="cursor-pointer hover:bg-gray-50"
              :class="{ 'bg-blue-50': selectedDates.includes(s.snapshotDate) }"
              @click="toggleSelect(s.snapshotDate)"
            >
              <td class="px-3 py-2">
                <input
                  type="checkbox"
                  :checked="selectedDates.includes(s.snapshotDate)"
                  class="rounded"
                  :data-testid="`snapshot-checkbox-${s.snapshotDate}`"
                  @click.stop
                  @change="toggleSelect(s.snapshotDate)"
                />
              </td>
              <td class="px-3 py-2 font-medium">{{ s.snapshotDate }}</td>
              <td class="px-3 py-2 text-right">{{ f.formatCurrency(s.totalValuation) }}</td>
              <td class="px-3 py-2 text-right" :class="f.colorClass(s.totalProfitLoss)">
                {{ f.formatCurrency(s.totalProfitLoss) }}
              </td>
              <td class="px-3 py-2 text-right" :class="f.colorClass(s.totalProfitLossPct)">
                {{ f.formatPct(s.totalProfitLossPct) }}
              </td>
              <td class="px-3 py-2 text-right text-gray-500">{{ s.holdingCount }}</td>
            </tr>
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

// 古い方がfrom、新しい方がto
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
    // 3つ目の選択: 最初の選択を解除して新しいものを追加
    selectedDates.value = [selectedDates.value[1], date]
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
