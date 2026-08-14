import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchDividends, fetchRealizedPnl } from '@/api/totalReturnApi'
import { lifetimeTotals } from '@/lib/totalReturn'
import type { DividendRow, RealizedPnlRow } from '@/types/totalReturn'

export const useTotalReturnStore = defineStore('totalReturn', () => {
  const realized = ref<RealizedPnlRow[]>([])
  const dividends = ref<DividendRow[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [r, d] = await Promise.all([fetchRealizedPnl(), fetchDividends()])
      realized.value = r
      dividends.value = d
      loaded.value = true
    } catch (e: unknown) {
      error.value = (e as { message?: string })?.message ?? '読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  // 取り込み後の再取得
  const reload = load

  // 生涯（取り込み開始以降の通算）の実現・配当合計。含みは呼び出し側で合算。
  // 年次サマリは現在含みが必要なためページ側で算出する（store には置かない）。
  const lifetime = computed(() => lifetimeTotals(realized.value, dividends.value))

  return { realized, dividends, loading, error, loaded, load, reload, lifetime }
})
