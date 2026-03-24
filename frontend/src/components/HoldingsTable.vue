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
          <th scope="col" class="px-3 py-2 text-right font-medium">配当利回り</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">PBR</th>
          <th scope="col" class="px-3 py-2 text-right font-medium">PER</th>
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
          <td class="px-3 py-2 text-gray-700">{{ f.nullish(h.companyName) }}</td>
          <td class="px-3 py-2">
            <span
              v-if="h.sectorName === '投資信託'"
              class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
            >投資信託</span>
            <span v-else class="text-gray-600">{{ h.sectorName }}</span>
          </td>
          <td class="px-3 py-2 text-right">{{ h.totalQuantity }}</td>
          <td class="px-3 py-2 text-right font-medium">{{ f.formatCurrency(h.totalValuation) }}</td>
          <td class="px-3 py-2 text-right" :class="f.colorClass(h.totalProfitLoss)">
            {{ f.formatCurrency(h.totalProfitLoss) }}
          </td>
          <td class="px-3 py-2 text-right" :class="f.colorClass(h.totalProfitLossPct)">
            {{ f.formatPct(h.totalProfitLossPct) }}
          </td>
          <td class="px-3 py-2 text-right">{{ f.nullish(h.dividendYield) }}</td>
          <td class="px-3 py-2 text-right">{{ f.nullish(h.pbr) }}</td>
          <td class="px-3 py-2 text-right">{{ f.nullish(h.per) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFormatters } from '@/composables/useFormatters'
import type { EnrichedHolding } from '@/types/portfolio'

const props = defineProps<{ holdings: EnrichedHolding[] }>()
const f = useFormatters()

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
