import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchSettings, updateSettings } from '@/api/settingsApi'
import type { Settings } from '@/types/settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      settings.value = await fetchSettings()
    } catch (e: unknown) {
      error.value = (e as { message?: string })?.message ?? '設定の読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  async function update(dto: Settings) {
    loading.value = true
    error.value = null
    try {
      settings.value = await updateSettings(dto)
    } catch (e: unknown) {
      error.value = (e as { message?: string })?.message ?? '設定の保存に失敗しました'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { settings, loading, error, load, update }
})
