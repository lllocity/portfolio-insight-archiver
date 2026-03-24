<template>
  <div
    v-if="message"
    data-testid="app-error"
    class="fixed top-0 left-0 right-0 z-50 flex items-start gap-3 bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-800"
    role="alert"
  >
    <span class="flex-1">{{ message }}</span>
    <button
      data-testid="app-error-close"
      class="shrink-0 font-bold hover:text-red-600"
      aria-label="閉じる"
      @click="$emit('close')"
    >
      ✕
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string | null }>()
defineEmits<{ close: [] }>()
</script>
