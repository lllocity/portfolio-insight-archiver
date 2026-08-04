<template>
  <div>
    <h2 class="mb-2 text-sm font-semibold text-gray-700">年ごとの確定損益（暦年）</h2>
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="w-full text-sm" data-testid="yearly-summary-table">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th scope="col" class="px-3 py-2 text-left font-medium">年</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">実現損益（税引前）</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">受取配当（税引後）</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">確定利益 計</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.year"
            class="border-t border-gray-100"
            data-testid="yearly-summary-row"
          >
            <td class="px-3 py-2 text-left text-gray-700">
              {{ row.year }}
              <span v-if="row.isCurrentYear" class="ml-1 text-xs text-gray-400" data-testid="yearly-current-note">
                （〜{{ todayStr }} 時点）
              </span>
            </td>
            <td class="px-3 py-2 text-right tabular-nums" :class="f.colorClass(String(row.realizedTotal))">
              {{ f.formatCurrency(String(row.realizedTotal)) }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums" :class="f.colorClass(String(row.dividendTotal))">
              {{ f.formatCurrency(String(row.dividendTotal)) }}
            </td>
            <td class="px-3 py-2 text-right font-medium tabular-nums" :class="f.colorClass(String(row.confirmedTotal))">
              {{ f.formatCurrency(String(row.confirmedTotal)) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-2 text-xs text-gray-400">
      ※確定申告の参考値です（配当は税引後・実現損益は約定日ベース。公式な数値は特定口座年間取引報告書をご確認ください）。
    </p>
  </div>
</template>

<script setup lang="ts">
import { useFormatters } from '@/composables/useFormatters'
import type { YearlySummaryRow } from '@/types/totalReturn'

defineProps<{
  rows: YearlySummaryRow[]
}>()

const f = useFormatters()

// 当年（YTD）の「〜YYYY/MM/DD 時点」表示用
const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
</script>
