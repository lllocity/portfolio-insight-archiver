// バックエンドの GlobalExceptionHandler が返す共通エラー型
export interface ApiError {
  status: number
  error: string
  message: string
  path: string
}
