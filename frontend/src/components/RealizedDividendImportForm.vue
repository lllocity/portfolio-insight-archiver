<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4" data-testid="tr-import-form">
    <h3 class="mb-3 text-sm font-semibold text-gray-700">実現損益・配当CSVインポート</h3>

    <!-- 取り込み種別の切り替え -->
    <div class="mb-3 flex gap-2" role="group" aria-label="取り込み種別">
      <button
        v-for="opt in kinds"
        :key="opt.value"
        type="button"
        data-testid="tr-import-kind"
        class="rounded border px-3 py-1 text-sm"
        :class="kind === opt.value
          ? 'border-blue-600 bg-blue-50 text-blue-700'
          : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
        @click="selectKind(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

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
          data-testid="tr-import-file-input"
          :disabled="loading"
          @change="onFileChange"
        />
      </label>
      <span class="flex-1 truncate text-sm text-gray-500">{{ fileLabel }}</span>
      <button
        data-testid="tr-import-button"
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        :disabled="loading || selectedFiles.length === 0"
        @click="handleImport"
      >
        {{ loading ? '取り込み中...' : 'インポート' }}
      </button>
    </div>

    <p class="mt-2 text-xs text-gray-400">
      {{ kind === 'realized'
        ? 'SBI「取引履歴 > 実現損益」CSV（DOMESTIC_STOCK_*.csv）'
        : 'SBI「配当金・分配金」CSV（DISTRIBUTION_*.csv）' }}。同じ期間を再取込しても二重計上されません。
    </p>

    <!-- エラー -->
    <p v-if="errorMessage" class="mt-1 text-xs text-red-600" data-testid="tr-import-error">
      {{ errorMessage }}
    </p>

    <!-- 成功 -->
    <div v-if="result?.success" class="mt-2 rounded bg-green-50 p-2 text-xs text-green-700" data-testid="tr-import-success">
      <p>
        {{ kindLabel }} {{ result.importedCount }} 件を取り込みました<template v-if="result.dateRange">（{{ result.dateRange.from }}〜{{ result.dateRange.to }}）</template>。
        <template v-if="result.skipped > 0">（{{ result.skipped }} 件スキップ）</template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { importDividends, importRealizedPnl } from '@/api/totalReturnImportApi'
import type { ImportRangeResult } from '@/types/totalReturn'

const emit = defineEmits<{ imported: [] }>()

type Kind = 'realized' | 'dividend'
const kinds: { value: Kind; label: string }[] = [
  { value: 'realized', label: '実現損益' },
  { value: 'dividend', label: '配当金' },
]

const kind = ref<Kind>('realized')
const selectedFiles = ref<File[]>([])
const loading = ref(false)
const result = ref<ImportRangeResult | null>(null)
const errorMessage = ref('')

const kindLabel = computed(() => kinds.find((k) => k.value === kind.value)?.label ?? '')
const fileLabel = computed(() =>
  selectedFiles.value.length === 0 ? '選択されていません' : selectedFiles.value[0].name,
)

function selectKind(value: Kind) {
  if (kind.value === value) return
  kind.value = value
  selectedFiles.value = []
  result.value = null
  errorMessage.value = ''
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFiles.value = Array.from(input.files ?? [])
  result.value = null
  errorMessage.value = ''
}

const IMPORT_TIMEOUT_MS = 120_000

async function handleImport() {
  errorMessage.value = ''
  if (selectedFiles.value.length === 0) {
    errorMessage.value = 'CSVファイルを選択してください'
    return
  }
  loading.value = true
  result.value = null
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('インポートがタイムアウトしました。再試行してください。')), IMPORT_TIMEOUT_MS),
    )
    const importFn = kind.value === 'realized' ? importRealizedPnl : importDividends
    result.value = await Promise.race([importFn(selectedFiles.value), timeoutPromise])
    emit('imported')
  } catch (e: unknown) {
    errorMessage.value = (e as { message?: string })?.message ?? 'インポートに失敗しました'
  } finally {
    loading.value = false
  }
}
</script>
