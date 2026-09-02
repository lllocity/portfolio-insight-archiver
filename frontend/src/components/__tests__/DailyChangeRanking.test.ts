import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DailyChangeRanking from '../DailyChangeRanking.vue'
import type { DailyChange } from '@/api/changeRankingApi'

vi.mock('@/api/changeRankingApi', () => ({
  fetchDailyChangeRanking: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))

import { fetchDailyChangeRanking } from '@/api/changeRankingApi'

const sample: DailyChange[] = [
  { snapshotDate: '2026-01-05', changeAmount: 100_000, changePct: 1.0 },
  { snapshotDate: '2026-01-06', changeAmount: -300_000, changePct: -2.0 },
  { snapshotDate: '2026-01-07', changeAmount: 250_000, changePct: 0.5 },
]

beforeEach(() => {
  vi.mocked(fetchDailyChangeRanking).mockReset()
})

function rowDates(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('[data-testid="change-row"]').map((r) => {
    const cells = r.findAll('td')
    return cells[0].text().replace(/^\d+\.\s*/, '')
  })
}

describe('DailyChangeRanking', () => {
  it('初期表示は騰落率の降順（上昇が上位）', async () => {
    vi.mocked(fetchDailyChangeRanking).mockResolvedValue(sample)
    const wrapper = mount(DailyChangeRanking)
    await flushPromises()
    expect(rowDates(wrapper)).toEqual(['2026-01-05', '2026-01-07', '2026-01-06'])
  })

  it('騰落率ヘッダ再クリックで昇順に切り替わる（下落が上位）', async () => {
    vi.mocked(fetchDailyChangeRanking).mockResolvedValue(sample)
    const wrapper = mount(DailyChangeRanking)
    await flushPromises()
    await wrapper.find('[data-testid="sort-pct"]').trigger('click')
    expect(rowDates(wrapper)).toEqual(['2026-01-06', '2026-01-07', '2026-01-05'])
  })

  it('騰落幅ヘッダで額順に並ぶ（率と順位が異なる）', async () => {
    vi.mocked(fetchDailyChangeRanking).mockResolvedValue(sample)
    const wrapper = mount(DailyChangeRanking)
    await flushPromises()
    await wrapper.find('[data-testid="sort-amount"]').trigger('click')
    expect(rowDates(wrapper)).toEqual(['2026-01-07', '2026-01-05', '2026-01-06'])
  })

  it('30件を超えると「もっと見る」で追加表示', async () => {
    const many: DailyChange[] = Array.from({ length: 35 }, (_, i) => ({
      snapshotDate: `2026-01-${String(i + 1).padStart(2, '0')}`,
      changeAmount: i,
      changePct: i,
    }))
    vi.mocked(fetchDailyChangeRanking).mockResolvedValue(many)
    const wrapper = mount(DailyChangeRanking)
    await flushPromises()
    expect(wrapper.findAll('[data-testid="change-row"]').length).toBe(30)
    await wrapper.find('button').trigger('click')
    expect(wrapper.findAll('[data-testid="change-row"]').length).toBe(35)
  })

  it('投信除外・入出金非対象の但し書きを表示', async () => {
    vi.mocked(fetchDailyChangeRanking).mockResolvedValue(sample)
    const wrapper = mount(DailyChangeRanking)
    await flushPromises()
    expect(wrapper.text()).toContain('投資信託は前日比の単位系が異なるため集計対象外')
  })

  it('データなしのとき案内を表示', async () => {
    vi.mocked(fetchDailyChangeRanking).mockResolvedValue([])
    const wrapper = mount(DailyChangeRanking)
    await flushPromises()
    expect(wrapper.text()).toContain('集計対象のデータがありません')
  })

  it('取得失敗時はエラーを表示', async () => {
    vi.mocked(fetchDailyChangeRanking).mockRejectedValue(new Error('boom'))
    const wrapper = mount(DailyChangeRanking)
    await flushPromises()
    expect(wrapper.text()).toContain('騰落率ランキングの取得に失敗しました')
  })
})
