import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchLatestPortfolio } from '@/api/portfolioApi'
import type { PortfolioResponse } from '@/types/portfolio'

export const usePortfolioStore = defineStore('portfolio', () => {
  const data = ref<PortfolioResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      data.value = await fetchLatestPortfolio()
    } catch (e: unknown) {
      error.value = (e as { message?: string })?.message ?? '読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  // CSVインポート後の再取得
  const reload = load

  return { data, loading, error, load, reload }
})
