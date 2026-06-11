<template>
  <div class="min-h-screen bg-gray-50">
    <!-- グローバルエラーバナー -->
    <AppError :message="globalError" @close="globalError = null" />

    <!-- ナビゲーション（ログイン画面では非表示） -->
    <nav v-if="$route.path !== '/login'" class="border-b border-gray-200 bg-white shadow-sm">
      <div class="mx-auto max-w-7xl px-4">
        <!-- 上段: ロゴ + デスクトップタブ + ログアウト -->
        <div class="flex h-12 items-center gap-1">
          <div class="mr-4 flex items-center gap-2">
            <img :src="'/logo.png'" alt="Kura" class="h-9 w-auto" />
          </div>

          <!-- タブ（sm以上で上段表示） -->
          <RouterLink
            v-for="tab in tabs"
            :key="tab.path"
            :to="tab.path"
            :data-testid="`nav-${tab.key}`"
            class="hidden rounded px-3 py-1.5 text-sm font-medium transition-colors sm:block"
            :class="$route.path === tab.path
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'"
          >
            {{ tab.label }}
          </RouterLink>

          <!-- ログアウト -->
          <div class="ml-auto flex items-center gap-2">
            <span v-if="authStore.user" class="hidden text-xs text-gray-400 md:block">
              {{ authStore.user.email }}
            </span>
            <button
              v-if="authStore.user"
              @click="authStore.signOut"
              class="rounded px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            >
              ログアウト
            </button>
          </div>
        </div>

        <!-- 下段タブ（モバイルのみ） -->
        <div class="flex border-t border-gray-100 sm:hidden">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.path"
            :to="tab.path"
            :data-testid="`nav-mobile-${tab.key}`"
            class="flex-1 py-2 text-center text-sm font-medium transition-colors"
            :class="$route.path === tab.path
              ? 'border-b-2 border-blue-600 text-blue-700'
              : 'text-gray-500 hover:text-gray-700'"
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
import { ref, onMounted, watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import AppError from '@/components/AppError.vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { useAuthStore } from '@/stores/authStore'

const portfolioStore = usePortfolioStore()
const authStore = useAuthStore()
const globalError = ref<string | null>(null)

const tabs = [
  { key: 'portfolio', path: '/portfolio', label: 'ポートフォリオ' },
  { key: 'history', path: '/history', label: '履歴' },
  { key: 'prompt', path: '/prompt', label: 'AIプロンプト' }
]

onMounted(async () => {
  await authStore.init()
  if (authStore.user && authStore.isAllowed) {
    await portfolioStore.load()
    if (portfolioStore.error) globalError.value = portfolioStore.error
  }
})

// portfolioStore.error が解消されたら AppError も自動的に閉じる
watch(() => portfolioStore.error, (newError) => {
  if (!newError) globalError.value = null
})
</script>
