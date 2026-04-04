<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4" data-testid="csv-import-form">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">CSVインポート</h3>
    <div class="flex items-center gap-2">
      <label
        class="cursor-pointer rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        :class="{ 'opacity-50 pointer-events-none': loading }"
      >
        ファイルを選択
        <input
          type="file"
          accept=".csv"
          class="hidden"
          data-testid="csv-import-file-input"
          :disabled="loading"
          @change="onFileChange"
        />
      </label>
      <span class="flex-1 truncate text-sm text-gray-500">
        {{ selectedFile?.name ?? '選択されていません' }}
      </span>
      <button
        data-testid="csv-import-button"
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        :disabled="loading || !selectedFile"
        @click="handleImport"
      >
        {{ loading ? '取り込み中...' : 'インポート' }}
      </button>
    </div>
    <div class="mt-2 flex items-center gap-2">
      <label class="text-sm text-gray-600 whitespace-nowrap">スナップショット日付:</label>
      <input
        type="date"
        class="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700"
        :max="today"
        v-model="snapshotDate"
        data-testid="csv-import-date-input"
      />
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
import { ref } from 'vue'
import { importCsv } from '@/api/csvApi'
import type { ImportResult } from '@/types/import'

const emit = defineEmits<{ imported: [] }>()

const today = new Date().toISOString().slice(0, 10)

const selectedFile = ref<File | null>(null)
const snapshotDate = ref(today)
const loading = ref(false)
const result = ref<ImportResult | null>(null)
const validationError = ref('')

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  result.value = null
  validationError.value = ''
}

async function handleImport() {
  validationError.value = ''
  if (!selectedFile.value) {
    validationError.value = 'CSVファイルを選択してください'
    return
  }
  loading.value = true
  result.value = null
  try {
    result.value = await importCsv(selectedFile.value, snapshotDate.value)
    emit('imported')
  } catch (e: unknown) {
    validationError.value = (e as { message?: string })?.message ?? 'インポートに失敗しました'
  } finally {
    loading.value = false
  }
}
</script>
