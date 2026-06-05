<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
      <div class="mb-8 flex flex-col items-center gap-3">
        <img src="/app_icon.png" alt="Kura" class="h-14 w-auto" />
        <p class="text-sm text-gray-500">アクセス権限がありません</p>
      </div>

      <div class="mb-6 rounded-lg bg-red-50 p-4 text-center">
        <p class="text-sm text-red-700">
          このアプリへのアクセスは許可されたユーザーのみに限定されています。
        </p>
      </div>

      <button
        @click="router.push('/login')"
        class="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        別のアカウントでログイン
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>
