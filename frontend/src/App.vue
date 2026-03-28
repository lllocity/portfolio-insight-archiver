<template>
  <div class="min-h-screen bg-gray-50">
    <!-- グローバルエラーバナー -->
    <AppError :message="globalError" @close="globalError = null" />

    <!-- ナビゲーション -->
    <nav class="border-b border-gray-200 bg-white shadow-sm">
      <div class="mx-auto max-w-7xl px-4">
        <div class="flex h-12 items-center gap-1">
          <div class="mr-4 flex items-center gap-2">
            <img src="/logo.png" alt="マイポートフォリオ帳" class="h-7 w-7 rounded" />
            <span class="text-sm font-bold text-gray-800">マイポートフォリオ帳</span>
          </div>
          <RouterLink
            v-for="tab in tabs"
            :key="tab.path"
            :to="tab.path"
            :data-testid="`nav-${tab.key}`"
            class="rounded px-3 py-1.5 text-sm font-medium transition-colors"
            :class="$route.path === tab.path
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'"
          >
            {{ tab.label }}
          </RouterLink>
        </div>
      </div>
    </nav>

    <!-- メインコンテンツ -->
    <main class="mx-auto max-w-7xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import AppError from '@/components/AppError.vue'
import { usePortfolioStore } from '@/stores/portfolioStore'

const portfolioStore = usePortfolioStore()
const globalError = ref<string | null>(null)

const tabs = [
  { key: 'portfolio', path: '/portfolio', label: 'ポートフォリオ' },
  { key: 'history', path: '/history', label: '履歴' },
  { key: 'prompt', path: '/prompt', label: 'AIプロンプト' }
]

onMounted(async () => {
  await portfolioStore.load()
  if (portfolioStore.error) globalError.value = portfolioStore.error
})
</script>
