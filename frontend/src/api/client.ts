import axios from 'axios'
import type { ApiError } from '@/types/api'

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

// レスポンスエラーをApiError形式に正規化
apiClient.interceptors.response.use(
  response => response,
  error => {
    const apiError: ApiError = error.response?.data ?? {
      status: 0,
      error: 'Network Error',
      message: 'サーバーに接続できません。バックエンドが起動しているか確認してください。',
      path: ''
    }
    return Promise.reject(apiError)
  }
)
