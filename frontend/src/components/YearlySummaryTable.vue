<template>
  <div>
    <h2 class="mb-2 text-sm font-semibold text-gray-700">年ごとのトータルリターン（暦年）</h2>
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="w-full text-sm" data-testid="yearly-summary-table">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th scope="col" class="px-3 py-2 text-left font-medium">年</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">実現損益（税引前）</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">受取配当（税引後）</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">含み損益</th>
            <th scope="col" class="px-3 py-2 text-right font-medium">トータルリターン</th>
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
            <td class="px-3 py-2 text-right tabular-nums" :class="row.isCurrentYear ? f.colorClass(String(row.unrealized)) : 'text-gray-300'">
              {{ row.isCurrentYear ? f.formatCurrency(String(row.unrealized)) : '―' }}
            </td>
            <td class="px-3 py-2 text-right font-medium tabular-nums" :class="f.colorClass(String(row.totalReturn))">
              {{ f.formatCurrency(String(row.totalReturn)) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-2 text-xs text-gray-400">
      ※過去年は確定分（実現＋配当）のみ。当年のみ現在の含み損益を含みます（前年末の含みが取れないため）。
      確定分は確定申告の参考値（配当は税引後・実現損益は約定日ベース。公式な数値は特定口座年間取引報告書をご確認ください）。
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
