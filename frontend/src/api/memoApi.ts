import { supabase } from '@/lib/supabase'

export async function upsertMemo(tickerCode: string, content: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { error } = await supabase.from('stock_memo').upsert(
    { user_id: user.id, ticker_code: tickerCode, content, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,ticker_code' }
  )
  if (error) throw new Error('メモの保存に失敗しました')
}

export async function deleteMemo(tickerCode: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { error } = await supabase
    .from('stock_memo')
    .delete()
    .eq('user_id', user.id)
    .eq('ticker_code', tickerCode)
  if (error) throw new Error('メモの削除に失敗しました')
}
