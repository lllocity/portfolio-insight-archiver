<template>
  <div
    data-testid="summary-card"
    class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
  >
    <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ label }}</p>
    <p
      data-testid="summary-card-value"
      class="mt-1 text-2xl font-bold"
      :class="colorClass"
    >
      {{ value }}
    </p>
    <p v-if="subValue" class="mt-0.5 text-xs text-gray-500">{{ subValue }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  subValue?: string
  colorClass?: string
}>()
</script>
