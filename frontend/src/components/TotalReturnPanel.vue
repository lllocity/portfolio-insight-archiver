<template>
  <div
    data-testid="total-return-panel"
    class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
  >
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="text-sm font-semibold text-gray-700">{{ title }}</h2>
      <p v-if="subtitle" class="text-xs text-gray-500" data-testid="total-return-subtitle">
        {{ subtitle }}
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
        :label="labels.unrealized.label"
        :value="unrealized != null ? f.formatCurrency(String(unrealized)) : '―'"
        :sub-value="labels.unrealized.subValue"
        :color-class="unrealized != null ? f.colorClass(String(unrealized)) : ''"
      />
      <SummaryCard
        :label="labels.realized.label"
        :value="f.formatCurrency(String(realized))"
        :sub-value="labels.realized.subValue"
        :color-class="f.colorClass(String(realized))"
      />
      <SummaryCard
        :label="labels.dividend.label"
        :value="f.formatCurrency(String(dividend))"
        :sub-value="labels.dividend.subValue"
        :color-class="f.colorClass(String(dividend))"
      />
    </div>

    <!-- 取得エラー時は globalError には載せず、ここに inline 表示 -->
    <p v-if="error" class="mt-3 text-xs text-red-600" data-testid="total-return-error">
      実現損益・配当データの取得に失敗しました（{{ error }}）
    </p>
    <p v-else-if="note" class="mt-3 text-xs text-gray-400" data-testid="total-return-note">
      {{ note }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormatters } from '@/composables/useFormatters'
import SummaryCard from '@/components/SummaryCard.vue'

interface CardLabel {
  label: string
  subValue?: string
}

const props = defineProps<{
  title: string
  subtitle?: string // 右上（集計期間など）
  note?: string // 下部注記
  unrealized: number | null // 含み損益（現在）
  realized: number // 実現損益
  dividend: number // 受取配当
  labels: { unrealized: CardLabel; realized: CardLabel; dividend: CardLabel }
  error?: string | null
}>()

const f = useFormatters()

// 合計 = 含み損益 + 実現損益 + 受取配当
const total = computed(() => (props.unrealized ?? 0) + props.realized + props.dividend)
</script>
