<template>
  <div>
    <h1 class="mb-4 text-lg font-bold text-gray-800">設定</h1>

    <div class="rounded-lg border border-gray-200 bg-white p-6">
      <!-- ローディング（初回取得中） -->
      <div v-if="store.loading && !formReady" class="py-4 text-center text-sm text-gray-500">
        読み込み中...
      </div>

      <form v-else class="space-y-4" @submit.prevent="handleSave">
        <!-- CSVデフォルトパス -->
        <div>
          <label for="csvDefaultPath" class="mb-1 block text-sm font-medium text-gray-700">
            CSVデフォルトパス
          </label>
          <input
            id="csvDefaultPath"
            v-model="csvDefaultPath"
            type="text"
            placeholder="/path/to/portfolio.csv"
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            data-testid="settings-csv-path"
          />
          <p class="mt-1 text-xs text-gray-500">CSVインポートフォームで使用するデフォルトのファイルパス</p>
        </div>

        <!-- エラー -->
        <div v-if="store.error" class="rounded bg-red-50 p-3 text-xs text-red-700" data-testid="settings-error">
          {{ store.error }}
        </div>

        <!-- 保存完了メッセージ -->
        <div v-if="saved" class="rounded bg-green-50 p-3 text-xs text-green-700" data-testid="settings-saved">
          設定を保存しました。
        </div>

        <!-- 保存ボタン -->
        <div class="flex justify-end">
          <button
            type="submit"
            class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="store.loading"
            data-testid="settings-save-btn"
          >
            {{ store.loading ? '保存中...' : '保存' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

const store = useSettingsStore()
const csvDefaultPath = ref('')
const formReady = ref(false)
const saved = ref(false)

// ストアのデータをフォームに反映
watch(
  () => store.settings,
  (s) => {
    if (s) {
      csvDefaultPath.value = s.csvDefaultPath ?? ''
      formReady.value = true
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (!store.settings) {
    await store.load()
  }
})

async function handleSave() {
  saved.value = false
  try {
    await store.update({
      csvDefaultPath: csvDefaultPath.value || null
    })
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 3000)
  } catch {
    // エラーは store.error で表示
  }
}
</script>
