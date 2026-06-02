import { supabase } from '@/lib/supabase'
import type { PromptResponse } from '@/types/prompt'

export async function fetchLatestPrompt(): Promise<PromptResponse | null> {
  const { data, error } = await supabase.functions.invoke('prompt-latest')
  if (error) throw new Error('プロンプトの生成に失敗しました')
  return data ?? null
}
