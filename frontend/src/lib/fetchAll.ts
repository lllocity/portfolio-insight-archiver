// PostgREST の全件取得（純関数・テスト可能）
// PostgREST は 1リクエストで返す行数に上限（max_rows、既定 1000）があり、超過分は
// エラーにならず黙って切り捨てられる。行数が増え続けるテーブルを全件取得する箇所は
// 必ずこの関数を通す。
//
// 使い方: .range() を付けないクエリを返す関数を渡す（範囲指定はこの関数が行う）。
//   fetchAll(() => supabase.from('t').select('...').eq(...).order('date').order('id'))
// 前提: クエリの並び順が一意であること（例: 日付＋id）。一意でないとページ境界で
//       行の重複・欠落が起き得る。
// 終了条件: 空ページが返るまで取得する。サーバ側の上限が pageSize より小さく
//           設定されていても取りこぼさないため（その分 1リクエスト多くなるが、
//           インデックス範囲の空読みなので負荷は無視できる）。
export const PAGE_SIZE = 1000

export interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
}

export interface RangeableQuery<T> {
  range(from: number, to: number): PromiseLike<PageResult<T>>
}

export async function fetchAll<T>(
  buildQuery: () => RangeableQuery<T>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = []
  for (;;) {
    const from = rows.length
    const { data, error } = await buildQuery().range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    if (page.length === 0) return rows
    rows.push(...page)
  }
}
