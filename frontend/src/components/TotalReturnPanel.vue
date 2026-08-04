<template>
  <div
    data-testid="total-return-panel"
    class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
  >
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="text-sm font-semibold text-gray-700">累計損益（含み＋実現＋配当）</h2>
      <p v-if="coverageRange" class="text-xs text-gray-500" data-testid="total-return-coverage">
        集計期間 {{ formatDate(coverageRange.from) }}〜{{ formatDate(coverageRange.to) }}
      </p>
    </div>

    <!-- 合計（主役） -->
    <div class="mb-4">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500">合計</p>
      <p
        data-testid="total-return-total"
        class="mt-1 text-3xl font-bold"
        :class="f.colorClass(String(total))"
      >
        {{ f.formatCurrency(String(total)) }}
      </p>
    </div>

    <!-- 内訳（含み損益・実現損益・受取配当） -->
    <div class="grid gap-3 sm:grid-cols-3">
      <SummaryCard
        label="含み損益（未実現）"
        :value="unrealized != null ? f.formatCurrency(String(unrealized)) : '―'"
        sub-value="現在の保有分"
        :color-class="unrealized != null ? f.colorClass(String(unrealized)) : ''"
      />
      <SummaryCard
        label="実現損益（税引前）"
        :value="f.formatCurrency(String(realized))"
        sub-value="売却で確定"
        :color-class="f.colorClass(String(realized))"
      />
      <SummaryCard
        label="受取配当（税引後）"
        :value="f.formatCurrency(String(dividend))"
        sub-value="入金済み"
        :color-class="f.colorClass(String(dividend))"
      />
    </div>

    <!-- 取得エラー時は globalError には載せず、ここに inline 表示 -->
    <p v-if="error" class="mt-3 text-xs text-red-600" data-testid="total-return-error">
      実現損益・配当データの取得に失敗しました（{{ error }}）
    </p>
    <p v-else-if="!coverageRange" class="mt-3 text-xs text-gray-400" data-testid="total-return-no-data">
      ※実現損益・配当CSVが未取込のため、含み損益のみを表示しています。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormatters } from '@/composables/useFormatters'
import SummaryCard from '@/components/SummaryCard.vue'

const props = defineProps<{
  unrealized: number | null // 含み損益（未実現）
  realized: number // 実現損益（税引前）
  dividend: number // 受取配当（税引後）
  coverageRange: { from: string; to: string } | null
  error?: string | null // 実現損益・配当の取得エラー（あれば inline 表示）
}>()

const f = useFormatters()

// 累計損益合計 = 含み損益 + 実現損益 + 受取配当
const total = computed(() => (props.unrealized ?? 0) + props.realized + props.dividend)

// "2026-08-04" → "2026/08/04"
function formatDate(d: string): string {
  return d.replace(/-/g, '/')
}
</script>
