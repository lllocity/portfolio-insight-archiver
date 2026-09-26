<template>
  <div>
    <div v-if="rows.length === 0" class="py-6 text-center text-sm text-gray-500" data-testid="dividend-empty">
      この年の受取配当はありません。
    </div>

    <div v-else class="overflow-x-auto">
      <!-- 銘柄別 -->
      <table v-if="view === 'ticker'" class="w-full text-sm" data-testid="dividend-by-ticker">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th
              v-for="c in tickerColumns"
              :key="c.key"
              scope="col"
              class="cursor-pointer select-none px-3 py-2 font-medium hover:text-gray-700"
              :class="c.align === 'left' ? 'text-left' : 'text-right'"
              :data-testid="`sort-${c.key}`"
              @click="setSort(c.key)"
            >
              {{ c.label }}{{ sortIndicator(c.key) }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="g in sortedTickerRows" :key="g.tickerCode" data-testid="dividend-ticker-row">
            <td class="px-3 py-2 text-left">{{ displayName(g.tickerCode, g.companyName) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ g.payments }}</td>
            <td class="px-3 py-2 text-right font-medium tabular-nums">{{ f.formatCurrency(String(g.amountNet)) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 明細 -->
      <table v-else class="w-full text-sm" data-testid="dividend-detail">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th
              v-for="c in detailColumns"
              :key="c.key"
              scope="col"
              class="cursor-pointer select-none px-3 py-2 font-medium hover:text-gray-700"
              :class="c.align === 'left' ? 'text-left' : 'text-right'"
              :data-testid="`sort-${c.key}`"
              @click="setSort(c.key)"
            >
              {{ c.label }}{{ sortIndicator(c.key) }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="(d, i) in sortedDetailRows" :key="i" data-testid="dividend-detail-row">
            <td class="whitespace-nowrap px-3 py-2 text-left">{{ d.payDate }}</td>
            <td class="px-3 py-2 text-left">{{ displayName(d.tickerCode, d.companyName) }}</td>
            <td class="whitespace-nowrap px-3 py-2 text-left text-gray-600">{{ d.account }}</td>
            <td class="whitespace-nowrap px-3 py-2 text-left text-gray-600">{{ f.nullish(d.product) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ d.quantity == null ? '―' : fmtQty(d.quantity) }}</td>
            <td class="px-3 py-2 text-right font-medium tabular-nums">{{ f.formatCurrency(String(d.amountNet)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { displayName, groupDividendsByTicker, sortRows } from '@/lib/incomeHistory'
import type { DividendByTicker, SortDir } from '@/lib/incomeHistory'
import type { DividendRow } from '@/types/totalReturn'
import { useFormatters } from '@/composables/useFormatters'

const props = defineProps<{
  rows: DividendRow[]
  view: 'ticker' | 'detail'
}>()

const f = useFormatters()

type TickerKey = keyof DividendByTicker
type DetailKey = keyof DividendRow
interface Column<K> { key: K; label: string; align: 'left' | 'right' }

const tickerColumns: Column<TickerKey>[] = [
  { key: 'tickerCode', label: '銘柄', align: 'left' },
  { key: 'payments', label: '受取回数', align: 'right' },
  { key: 'amountNet', label: '受取額', align: 'right' },
]

const detailColumns: Column<DetailKey>[] = [
  { key: 'payDate', label: '受渡日', align: 'left' },
  { key: 'tickerCode', label: '銘柄', align: 'left' },
  { key: 'account', label: '口座', align: 'left' },
  { key: 'product', label: '商品', align: 'left' },
  { key: 'quantity', label: '数量', align: 'right' },
  { key: 'amountNet', label: '受取額', align: 'right' },
]

// 既定の並び: 銘柄別は受取額の大きい順、明細は受渡日の新しい順
const defaultKey = () => (props.view === 'ticker' ? 'amountNet' : 'payDate')
const sortKey = ref<string>(defaultKey())
const sortDir = ref<SortDir>('desc')

watch(() => props.view, () => {
  sortKey.value = defaultKey()
  sortDir.value = 'desc'
})

function setSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function sortIndicator(key: string): string {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'desc' ? ' ▼' : ' ▲'
}

const sortedTickerRows = computed(() =>
  sortRows(groupDividendsByTicker(props.rows), sortKey.value as TickerKey, sortDir.value),
)
const sortedDetailRows = computed(() =>
  sortRows(props.rows, sortKey.value as DetailKey, sortDir.value),
)

function fmtQty(n: number): string {
  return n.toLocaleString('ja-JP', { maximumFractionDigits: 4 })
}
</script>
