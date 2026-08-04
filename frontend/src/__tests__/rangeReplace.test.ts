import { describe, it, expect } from 'vitest'
import { mergeDateRange, rangeReplaceFile } from '../../../supabase/functions/_shared/range-replace.ts'

// delete().eq().gte().lte() と insert() の呼び出しを記録するフェイク Supabase クライアント。
function makeMockSupabase(insertError: unknown = null, deleteError: unknown = null) {
  const calls = {
    deletes: [] as Array<{ table: string; filters: Record<string, unknown> }>,
    inserts: [] as Array<{ table: string; rows: unknown[] }>,
  }
  const client = {
    from(table: string) {
      return {
        delete() {
          const rec = { table, filters: {} as Record<string, unknown> }
          calls.deletes.push(rec)
          const chain = {
            eq(c: string, v: unknown) { rec.filters[c] = v; return chain },
            gte(c: string, v: unknown) { rec.filters[`gte:${c}`] = v; return chain },
            lte(c: string, v: unknown) {
              rec.filters[`lte:${c}`] = v
              return Promise.resolve({ error: deleteError })
            },
          }
          return chain
        },
        insert(rows: unknown[]) {
          calls.inserts.push({ table, rows })
          return Promise.resolve({ error: insertError })
        },
      }
    },
  }
  return { client, calls }
}

interface Row { date: string; code: string }
const opts = (records: Row[]) => ({
  table: 'realized_pnl',
  dateColumn: 'trade_date',
  records,
  getDate: (r: Row) => r.date,
  toRow: (r: Row) => ({ user_id: 'u1', trade_date: r.date, ticker_code: r.code }),
})

describe('rangeReplaceFile', () => {
  it('日付のmin〜maxで範囲削除し、マップした行を挿入する', async () => {
    const { client, calls } = makeMockSupabase()
    const records: Row[] = [
      { date: '2026-06-18', code: '6723' },
      { date: '2026-07-30', code: '9278' },
      { date: '2026-05-29', code: '1963' },
    ]
    const res = await rangeReplaceFile(client, 'u1', opts(records))

    expect(res).toEqual({ importedCount: 3, dateRange: { from: '2026-05-29', to: '2026-07-30' } })
    expect(calls.deletes).toHaveLength(1)
    expect(calls.deletes[0]).toEqual({
      table: 'realized_pnl',
      filters: { user_id: 'u1', 'gte:trade_date': '2026-05-29', 'lte:trade_date': '2026-07-30' },
    })
    expect(calls.inserts[0].rows).toHaveLength(3)
    expect(calls.inserts[0].rows[0]).toEqual({ user_id: 'u1', trade_date: '2026-06-18', ticker_code: '6723' })
  })

  it('レコードが空なら削除も挿入もせず dateRange は null', async () => {
    const { client, calls } = makeMockSupabase()
    const res = await rangeReplaceFile(client, 'u1', opts([]))
    expect(res).toEqual({ importedCount: 0, dateRange: null })
    expect(calls.deletes).toHaveLength(0)
    expect(calls.inserts).toHaveLength(0)
  })

  it('削除が成功しても挿入が失敗したら例外を投げる（呼び出し側でエラー化）', async () => {
    const { client } = makeMockSupabase(new Error('insert failed'))
    await expect(rangeReplaceFile(client, 'u1', opts([{ date: '2026-01-01', code: '1' }]))).rejects.toThrow('insert failed')
  })
})

describe('mergeDateRange', () => {
  it('null と範囲の結合', () => {
    const r = { from: '2026-01-01', to: '2026-03-31' }
    expect(mergeDateRange(null, r)).toEqual(r)
    expect(mergeDateRange(r, null)).toEqual(r)
    expect(mergeDateRange(null, null)).toBeNull()
  })

  it('複数範囲から最小from・最大toを取る', () => {
    const a = { from: '2026-04-01', to: '2026-08-04' }
    const b = { from: '2025-04-01', to: '2026-03-31' }
    expect(mergeDateRange(a, b)).toEqual({ from: '2025-04-01', to: '2026-08-04' })
  })
})
