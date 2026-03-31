<template>
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
    <table class="w-full text-sm" data-testid="holdings-table">
      <thead class="bg-gray-50 text-xs text-gray-500">
        <tr>
          <th scope="col" class="px-3 py-2 text-left font-medium">銘柄コード</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">企業名</th>
          <th scope="col" class="px-3 py-2 text-left font-medium">セクター</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">数量</th>
          <th
            scope="col"
            class="cursor-pointer px-3 py-2 text-right font-medium hover:text-gray-800"
            :aria-sort="sortAriaLabel('totalValuation')"
            @click="toggleSort('totalValuation')"
          >
            評価額 {{ sortIcon('totalValuation') }}
          </th>
          <th
            scope="col"
            class="cursor-pointer px-3 py-2 text-right font-medium hover:text-gray-800"
            :aria-sort="sortAriaLabel('totalProfitLoss')"
            @click="toggleSort('totalProfitLoss')"
          >
            損益 {{ sortIcon('totalProfitLoss') }}
          </th>
          <th
            scope="col"
            class="cursor-pointer px-3 py-2 text-right font-medium hover:text-gray-800"
            :aria-sort="sortAriaLabel('totalProfitLossPct')"
            @click="toggleSort('totalProfitLossPct')"
          >
            損益率 {{ sortIcon('totalProfitLossPct') }}
          </th>
          <th scope="col" class="px-3 py-2 text-left font-medium">メモ</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr
          v-for="h in sortedHoldings"
          :key="h.tickerCode"
          data-testid="holdings-row"
          class="hover:bg-gray-50"
        >
          <td class="px-3 py-2 font-mono font-medium">{{ h.tickerCode }}</td>
          <td class="px-3 py-2 text-gray-700">
            <a
              v-if="h.companyName && /^\d{4}$/.test(h.tickerCode)"
              :href="`https://finance.yahoo.co.jp/quote/${h.tickerCode}.T`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline"
            >{{ h.companyName }}</a>
            <span v-else>{{ f.nullish(h.companyName) }}</span>
          </td>
          <td class="px-3 py-2">
            <span
              v-if="h.sectorName === '投資信託'"
              class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
            >投資信託</span>
            <span v-else class="text-gray-600">{{ h.sectorName }}</span>
          </td>
          <td class="px-3 py-2 text-right">{{ h.totalQuantity }}</td>
          <td class="px-3 py-2 text-right font-medium">{{ f.formatCurrency(h.totalValuation) }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right" :class="f.colorClass(h.totalProfitLoss)">
            {{ f.formatCurrency(h.totalProfitLoss) }}
          </td>
          <td class="whitespace-nowrap px-3 py-2 text-right" :class="f.colorClass(h.totalProfitLossPct)">
            {{ f.formatPct(h.totalProfitLossPct) }}
          </td>
          <td class="px-3 py-2 min-w-[120px] max-w-[200px]">
            <template v-if="editingTicker === h.tickerCode">
              <div class="flex flex-col gap-1">
                <input
                  v-model="editingContent"
                  type="text"
                  maxlength="100"
                  class="w-full rounded border border-blue-400 px-2 py-0.5 text-xs focus:outline-none"
                  @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) saveMemo(h.tickerCode) }"
                  @keydown.esc="cancelEdit"
                  @blur="saveMemo(h.tickerCode)"
                  autofocus
                />
                <span class="text-right text-xs text-gray-400">{{ editingContent.length }}/100</span>
              </div>
            </template>
            <template v-else>
              <span
                v-if="memoMap[h.tickerCode]"
                class="cursor-pointer text-xs text-gray-600 hover:text-gray-900"
                @click="startEdit(h.tickerCode, memoMap[h.tickerCode])"
              >{{ memoMap[h.tickerCode] }}</span>
              <button
                v-else
                class="text-xs text-gray-400 hover:text-blue-600"
                @click="startEdit(h.tickerCode, '')"
              >＋</button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFormatters } from '@/composables/useFormatters'
import { upsertMemo, deleteMemo } from '@/api/memoApi'
import type { EnrichedHolding } from '@/types/portfolio'

const props = defineProps<{ holdings: EnrichedHolding[] }>()
const f = useFormatters()

// メモのローカル状態（props から初期化）
const memoMap = ref<Record<string, string>>(
  Object.fromEntries(props.holdings.filter(h => h.memo).map(h => [h.tickerCode, h.memo!]))
)

const editingTicker = ref<string | null>(null)
const editingContent = ref('')

function startEdit(tickerCode: string, current: string) {
  editingTicker.value = tickerCode
  editingContent.value = current
}

function cancelEdit() {
  editingTicker.value = null
  editingContent.value = ''
}

async function saveMemo(tickerCode: string) {
  if (editingTicker.value !== tickerCode) return
  const content = editingContent.value.trim()
  try {
    if (content) {
      await upsertMemo(tickerCode, content)
      memoMap.value[tickerCode] = content
    } else {
      await deleteMemo(tickerCode)
      delete memoMap.value[tickerCode]
    }
  } catch {
    // 失敗時はローカル状態を変更しない
  }
  editingTicker.value = null
  editingContent.value = ''
}

type SortKey = 'totalValuation' | 'totalProfitLoss' | 'totalProfitLossPct'
const sortKey = ref<SortKey>('totalValuation')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

function sortAriaLabel(key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sortKey.value !== key) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

const sortedHoldings = computed(() => {
  return [...props.holdings].sort((a, b) => {
    const av = parseFloat(a[sortKey.value])
    const bv = parseFloat(b[sortKey.value])
    return sortDir.value === 'asc' ? av - bv : bv - av
  })
})
</script>
