<template>
  <div data-testid="diff-view" class="rounded-lg border border-gray-200 bg-white p-4">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">スナップショット差分</h3>

    <!-- 変化なし -->
    <p v-if="isEmpty" class="text-sm text-gray-500">前回と変化なし</p>

    <template v-else>
      <!-- 評価額変化 -->
      <div class="mb-3 flex items-center gap-2">
        <span class="text-xs text-gray-500">評価額変化:</span>
        <span class="font-semibold" :class="formatters.colorClass(diff.valuationChange)">
          {{ formatters.formatCurrency(diff.valuationChange) }}
        </span>
      </div>

      <!-- 追加銘柄 -->
      <div v-if="diff.addedTickers.length > 0" class="mb-2">
        <p class="text-xs font-medium text-gray-500 mb-1">新規追加</p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="t in diff.addedTickers"
            :key="t.tickerCode"
            data-testid="diff-added-ticker"
            class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
          >
            + {{ t.tickerCode }}<template v-if="t.companyName"> {{ t.companyName }}</template>
          </span>
        </div>
      </div>

      <!-- 除去銘柄 -->
      <div v-if="diff.removedTickers.length > 0" class="mb-2">
        <p class="text-xs font-medium text-gray-500 mb-1">除去</p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="t in diff.removedTickers"
            :key="t.tickerCode"
            data-testid="diff-removed-ticker"
            class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
          >
            - {{ t.tickerCode }}<template v-if="t.companyName"> {{ t.companyName }}</template>
          </span>
        </div>
      </div>

      <!-- 変化銘柄 -->
      <div v-if="diff.changed.length > 0">
        <p class="text-xs font-medium text-gray-500 mb-1">変化あり</p>
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-100 text-gray-500">
              <th class="pb-1 text-left font-medium">銘柄</th>
              <th class="pb-1 text-right font-medium">数量</th>
              <th class="pb-1 text-right font-medium">評価額変化</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in diff.changed"
              :key="item.tickerCode"
              data-testid="diff-changed-row"
              class="border-b border-gray-50"
            >
              <td class="py-1">
                <span class="font-mono font-medium">{{ item.tickerCode }}</span>
                <span v-if="item.companyName" class="ml-1 text-gray-500">{{ item.companyName }}</span>
              </td>
              <td class="py-1 text-right text-gray-700">
                {{ item.quantityBefore }}
                <span class="text-gray-400">→</span>
                {{ item.quantityAfter }}
                <span
                  v-if="item.quantityDiff !== '0'"
                  class="ml-1"
                  :class="formatters.colorClass(item.quantityDiff)"
                >({{ item.quantityDiff }})</span>
              </td>
              <td class="py-1 text-right" :class="formatters.colorClass(item.valuationDiff)">
                {{ formatters.formatCurrency(item.valuationDiff) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormatters } from '@/composables/useFormatters'
import type { SnapshotDiff } from '@/types/portfolio'

const props = defineProps<{ diff: SnapshotDiff }>()
const formatters = useFormatters()

const isEmpty = computed(() =>
  props.diff.addedTickers.length === 0 &&
  props.diff.removedTickers.length === 0 &&
  props.diff.changed.length === 0 &&
  parseFloat(props.diff.valuationChange) === 0
)
</script>
