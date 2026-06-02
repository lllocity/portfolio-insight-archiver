import { supabase } from '@/lib/supabase'

// Supabase Edge Function を呼び出す共通ヘルパー
export async function invokeFunction<T>(
  name: string,
  options?: { body?: FormData | object; method?: string; params?: Record<string, string> }
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: options?.body,
    method: options?.method ?? 'GET',
  })
  if (error) throw error
  return data as T
}
