import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import YearlySummaryTable from '../YearlySummaryTable.vue'
import type { YearlySummaryRow } from '@/types/totalReturn'

const rows: YearlySummaryRow[] = [
  { year: 2026, realizedTotal: 1_823_430, dividendTotal: 310_009, confirmedTotal: 2_133_439, unrealized: 9_306_791, totalReturn: 11_440_230, isCurrentYear: true },
  { year: 2025, realizedTotal: 4_371_810, dividendTotal: 500_000, confirmedTotal: 4_871_810, unrealized: 0, totalReturn: 4_871_810, isCurrentYear: false },
  { year: 2024, realizedTotal: -100_000, dividendTotal: 0, confirmedTotal: -100_000, unrealized: 0, totalReturn: -100_000, isCurrentYear: false },
]

describe('YearlySummaryTable', () => {
  it('各年の行を描画する', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    expect(wrapper.findAll('[data-testid="yearly-summary-row"]')).toHaveLength(3)
  })

  it('当年行は実現・配当・含み・トータルリターンを表示する', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    const firstRow = wrapper.findAll('[data-testid="yearly-summary-row"]')[0]
    const text = firstRow.text()
    expect(text).toContain('¥1,823,430') // 実現
    expect(text).toContain('¥310,009') // 配当
    expect(text).toContain('¥9,306,791') // 含み（当年のみ）
    expect(text).toContain('¥11,440,230') // トータルリターン
  })

  it('過去年の含み損益列は「―」', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    const row2025 = wrapper.findAll('[data-testid="yearly-summary-row"]')[1]
    const cells = row2025.findAll('td')
    // 含み損益セル（4列目）が「―」
    expect(cells[3].text()).toBe('―')
    // トータルリターン＝確定分（4,871,810）
    expect(row2025.text()).toContain('¥4,871,810')
  })

  it('当年行にはYTD注記を出し、他の年には出さない', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    const notes = wrapper.findAll('[data-testid="yearly-current-note"]')
    expect(notes).toHaveLength(1)
    expect(notes[0].text()).toContain('時点')
  })

  it('マイナスのトータルリターンは赤系クラスになる', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    const row2024 = wrapper.findAll('[data-testid="yearly-summary-row"]')[2]
    const cells = row2024.findAll('td')
    // トータルリターンセル（5列目）が赤
    expect(cells[4].classes()).toContain('text-red-600')
  })

  it('当年のみ含みを含む旨・参考値の注記を表示する', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    expect(wrapper.text()).toContain('当年のみ現在の含み損益を含みます')
    expect(wrapper.text()).toContain('特定口座年間取引報告書')
  })

  it('当年のみ（データなし）でも1行描画する', () => {
    const only: YearlySummaryRow[] = [
      { year: 2026, realizedTotal: 0, dividendTotal: 0, confirmedTotal: 0, unrealized: 0, totalReturn: 0, isCurrentYear: true },
    ]
    const wrapper = mount(YearlySummaryTable, { props: { rows: only } })
    expect(wrapper.findAll('[data-testid="yearly-summary-row"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="yearly-current-note"]').exists()).toBe(true)
  })
})
