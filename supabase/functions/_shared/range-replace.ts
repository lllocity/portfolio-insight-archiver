// deno-lint-ignore-file no-explicit-any
// 範囲リプレース取り込みの共通ロジック（realized-import / dividend-import で共用）。
// 1ファイル分のレコードについて、その日付 min〜max の既存行を削除してから挿入する。
// ファイル単位で呼ぶことで、複数ファイル間の「間の期間」を誤って削除しない。
//
// 注意: delete と insert は別リクエストで非トランザクション。insert 失敗時は
// 当該期間の既存行が消えたまま復旧されないが、SBI から再取込可能なため受容する
// （既存 csv-import と同方針）。厳密化するなら delete+insert を単一トランザクションで
// 行う RPC 化が必要。

export interface RangeReplaceResult {
  importedCount: number
  dateRange: { from: string; to: string } | null
}

export async function rangeReplaceFile<T>(
  supabase: any,
  userId: string,
  opts: {
    table: string
    dateColumn: string
    records: T[]
    getDate: (r: T) => string
    toRow: (r: T) => Record<string, unknown>
  },
): Promise<RangeReplaceResult> {
  const { table, dateColumn, records, getDate, toRow } = opts
  if (records.length === 0) return { importedCount: 0, dateRange: null }

  const dates = records.map(getDate).sort()
  const from = dates[0]
  const to = dates[dates.length - 1]

  const { error: delError } = await supabase
    .from(table)
    .delete()
    .eq('user_id', userId)
    .gte(dateColumn, from)
    .lte(dateColumn, to)
  if (delError) throw delError

  const { error: insError } = await supabase.from(table).insert(records.map(toRow))
  if (insError) throw insError

  return { importedCount: records.length, dateRange: { from, to } }
}

// 複数ファイルの dateRange を結合（全体の最小 from・最大 to）
export function mergeDateRange(
  acc: { from: string; to: string } | null,
  next: { from: string; to: string } | null,
): { from: string; to: string } | null {
  if (!next) return acc
  if (!acc) return next
  return {
    from: next.from < acc.from ? next.from : acc.from,
    to: next.to > acc.to ? next.to : acc.to,
  }
}
