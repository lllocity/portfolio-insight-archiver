<template>
  <div>
    <h1 class="mb-4 text-lg font-bold text-gray-800">AIプロンプト</h1>

    <!-- ローディング -->
    <div v-if="loading" class="py-8 text-center text-sm text-gray-500">読み込み中...</div>

    <!-- エラー -->
    <div v-else-if="error" class="rounded bg-red-50 p-3 text-xs text-red-700">
      {{ error }}
    </div>

    <!-- データなし -->
    <div
      v-else-if="!prompt"
      class="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500"
      data-testid="prompt-empty"
    >
      スナップショットがまだありません。CSVをインポートしてください。
    </div>

    <div v-else class="space-y-3">
      <!-- テキストエリア -->
      <textarea
        :value="prompt"
        readonly
        rows="20"
        class="w-full rounded-lg border border-gray-200 bg-white p-3 font-mono text-xs text-gray-800 focus:outline-none"
        data-testid="prompt-textarea"
      />

      <!-- ボタン群 -->
      <div class="flex gap-2">
        <button
          class="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          :disabled="copying"
          data-testid="prompt-copy-btn"
          @click="handleCopy"
        >
          {{ copying ? 'コピー済み' : 'コピー' }}
        </button>
        <button
          class="rounded border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          :disabled="loading"
          data-testid="prompt-regenerate-btn"
          @click="load"
        >
          再生成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchLatestPrompt } from '@/api/promptApi'
import { useClipboard } from '@/composables/useClipboard'

const prompt = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const copying = ref(false)

const { copy } = useClipboard()

async function load() {
  loading.value = true
  error.value = null
  try {
    const result = await fetchLatestPrompt()
    prompt.value = result?.prompt ?? null
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message ?? 'プロンプトの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

async function handleCopy() {
  if (!prompt.value) return
  await copy(prompt.value)
  copying.value = true
  setTimeout(() => {
    copying.value = false
  }, 2000)
}

onMounted(load)
</script>
