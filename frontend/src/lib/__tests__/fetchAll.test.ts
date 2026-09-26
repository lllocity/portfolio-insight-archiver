import { describe, it, expect, vi } from 'vitest'
import { fetchAll } from '../fetchAll'

// total 件のデータを、サーバ上限 serverMax 行で切り詰めて返す擬似 PostgREST クエリ
function fakeQuery(total: number, serverMax = Infinity) {
  const all = Array.from({ length: total }, (_, i) => i)
  const range = vi.fn(async (from: number, to: number) => ({
    data: all.slice(from, Math.min(to + 1, from + serverMax)),
    error: null,
  }))
  return { build: () => ({ range }), range }
}

describe('fetchAll', () => {
  it('ページサイズを超える件数を全件取得する', async () => {
    const q = fakeQuery(2500)
    const rows = await fetchAll(q.build, 1000)
    expect(rows).toHaveLength(2500)
    expect(rows[0]).toBe(0)
    expect(rows[2499]).toBe(2499)
    // 1000 + 1000 + 500 + 空ページ
    expect(q.range).toHaveBeenCalledTimes(4)
    expect(q.range).toHaveBeenNthCalledWith(1, 0, 999)
    expect(q.range).toHaveBeenNthCalledWith(2, 1000, 1999)
  })

  it('0件なら空配列を返す', async () => {
    const rows = await fetchAll(fakeQuery(0).build, 1000)
    expect(rows).toEqual([])
  })

  it('ちょうどページサイズの倍数でも取りこぼさない', async () => {
    const rows = await fetchAll(fakeQuery(2000).build, 1000)
    expect(rows).toHaveLength(2000)
  })

  it('サーバ上限がページサイズより小さくても全件取得する', async () => {
    const rows = await fetchAll(fakeQuery(1200, 500).build, 1000)
    expect(rows).toEqual(Array.from({ length: 1200 }, (_, i) => i))
  })

  it('ページごとにクエリを組み立て直す', async () => {
    const q = fakeQuery(1500)
    const build = vi.fn(q.build)
    await fetchAll(build, 1000)
    expect(build).toHaveBeenCalledTimes(3)
  })

  it('エラー時は例外を投げる', async () => {
    const build = () => ({ range: async () => ({ data: null, error: { message: 'boom' } }) })
    await expect(fetchAll(build)).rejects.toThrow('boom')
  })
})
