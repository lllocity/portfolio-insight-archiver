<template>
  <div>
    <div v-if="trades.length === 0" class="py-6 text-center text-sm text-gray-500" data-testid="realized-empty">
      この年の実現損益はありません。
    </div>

    <div v-else class="overflow-x-auto">
      <!-- 銘柄別 -->
      <table v-if="view === 'ticker'" class="w-full text-sm" data-testid="realized-by-ticker">
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
          <tr v-for="g in sortedTickerRows" :key="g.tickerCode" data-testid="realized-ticker-row">
            <td class="px-3 py-2 text-left">{{ displayName(g.tickerCode, g.companyName) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ g.trades }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ fmtQty(g.quantity) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ f.formatCurrency(String(g.proceeds)) }}</td>
            <td class="px-3 py-2 text-right font-medium tabular-nums" :class="f.colorClass(String(g.realizedPl))">
              {{ f.formatCurrency(String(g.realizedPl)) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 明細（分割約定はまとめ済み） -->
      <table v-else class="w-full text-sm" data-testid="realized-detail">
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
          <tr
            v-for="t in sortedDetailRows"
            :key="`${t.tradeDate}-${t.tickerCode}-${t.account}`"
            data-testid="realized-detail-row"
          >
            <td class="whitespace-nowrap px-3 py-2 text-left">{{ t.tradeDate }}</td>
            <td class="px-3 py-2 text-left">
              {{ displayName(t.tickerCode, t.companyName) }}
              <span v-if="t.executions > 1" class="ml-1 text-xs text-gray-400" data-testid="executions-note">
                ({{ t.executions }}約定)
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-left text-gray-600">{{ t.account }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ fmtQty(t.quantity) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ f.formatCurrency(String(t.proceeds)) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ fmtPrice(t.avgCost) }}</td>
            <td class="px-3 py-2 text-right font-medium tabular-nums" :class="f.colorClass(String(t.realizedPl))">
              {{ f.formatCurrency(String(t.realizedPl)) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { displayName, groupRealizedByTicker, sortRows } from '@/lib/incomeHistory'
import type { RealizedByTicker, RealizedTrade, SortDir } from '@/lib/incomeHistory'
import { useFormatters } from '@/composables/useFormatters'

const props = defineProps<{
  trades: RealizedTrade[]
  view: 'ticker' | 'detail'
}>()

const f = useFormatters()

type TickerKey = keyof RealizedByTicker
type DetailKey = keyof RealizedTrade
interface Column<K> { key: K; label: string; align: 'left' | 'right' }

const tickerColumns: Column<TickerKey>[] = [
  { key: 'tickerCode', label: '銘柄', align: 'left' },
  { key: 'trades', label: '取引回数', align: 'right' },
  { key: 'quantity', label: '売却数量', align: 'right' },
  { key: 'proceeds', label: '売却額', align: 'right' },
  { key: 'realizedPl', label: '実現損益', align: 'right' },
]

const detailColumns: Column<DetailKey>[] = [
  { key: 'tradeDate', label: '約定日', align: 'left' },
  { key: 'tickerCode', label: '銘柄', align: 'left' },
  { key: 'account', label: '口座', align: 'left' },
  { key: 'quantity', label: '数量', align: 'right' },
  { key: 'proceeds', label: '売却額', align: 'right' },
  { key: 'avgCost', label: '平均取得単価', align: 'right' },
  { key: 'realizedPl', label: '実現損益', align: 'right' },
]

// 既定の並び: 銘柄別は実現損益の大きい順、明細は約定日の新しい順
const defaultKey = () => (props.view === 'ticker' ? 'realizedPl' : 'tradeDate')
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
  sortRows(groupRealizedByTicker(props.trades), sortKey.value as TickerKey, sortDir.value),
)
const sortedDetailRows = computed(() =>
  sortRows(props.trades, sortKey.value as DetailKey, sortDir.value),
)

function fmtQty(n: number): string {
  return n.toLocaleString('ja-JP', { maximumFractionDigits: 4 })
}

function fmtPrice(n: number | null): string {
  if (n == null) return '―'
  return `¥${n.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}`
}
</script>
