<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4" data-testid="csv-import-form">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">CSVインポート</h3>
    <div class="flex gap-2">
      <input
        v-model="filePath"
        data-testid="csv-import-path-input"
        type="text"
        placeholder="/data/New_file.csv"
        class="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        :disabled="loading"
      />
      <button
        data-testid="csv-import-button"
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        :disabled="loading || !filePath.trim()"
        @click="handleImport"
      >
        {{ loading ? '取り込み中...' : 'インポート' }}
      </button>
    </div>

    <!-- バリデーションエラー -->
    <p v-if="validationError" class="mt-1 text-xs text-red-600" data-testid="csv-import-validation-error">
      {{ validationError }}
    </p>

    <!-- 成功メッセージ -->
    <div v-if="result?.success" class="mt-2 rounded bg-green-50 p-2 text-xs text-green-700" data-testid="csv-import-success">
      <p>{{ result.importedCount }} 銘柄を取り込みました（{{ result.snapshotDate }}）</p>
    </div>

    <!-- 警告 -->
    <div v-if="result?.warnings?.length" class="mt-2 rounded bg-yellow-50 p-2 text-xs text-yellow-700" data-testid="csv-import-warnings">
      <p v-for="w in result.warnings" :key="w">⚠ {{ w }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { importCsv } from '@/api/csvApi'
import type { ImportResult } from '@/types/import'

const emit = defineEmits<{ imported: [] }>()

const settingsStore = useSettingsStore()
const filePath = ref('')
const loading = ref(false)
const result = ref<ImportResult | null>(null)
const validationError = ref('')

onMounted(() => {
  filePath.value = settingsStore.settings?.csvDefaultPath ?? ''
})

async function handleImport() {
  validationError.value = ''
  if (!filePath.value.trim()) {
    validationError.value = 'ファイルパスを入力してください'
    return
  }
  loading.value = true
  result.value = null
  try {
    result.value = await importCsv({ filePath: filePath.value.trim() })
    emit('imported')
  } catch (e: unknown) {
    validationError.value = (e as { message?: string })?.message ?? 'インポートに失敗しました'
  } finally {
    loading.value = false
  }
}
</script>
