import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import YearlySummaryTable from '../YearlySummaryTable.vue'
import type { YearlySummaryRow } from '@/types/totalReturn'

const rows: YearlySummaryRow[] = [
  { year: 2026, realizedTotal: 1_823_430, dividendTotal: 310_009, confirmedTotal: 2_133_439, isCurrentYear: true },
  { year: 2025, realizedTotal: 4_371_810, dividendTotal: 500_000, confirmedTotal: 4_871_810, isCurrentYear: false },
  { year: 2024, realizedTotal: -100_000, dividendTotal: 0, confirmedTotal: -100_000, isCurrentYear: false },
]

describe('YearlySummaryTable', () => {
  it('各年の行を描画する', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    expect(wrapper.findAll('[data-testid="yearly-summary-row"]')).toHaveLength(3)
  })

  it('実現損益・受取配当・確定利益計を表示する', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    const firstRow = wrapper.findAll('[data-testid="yearly-summary-row"]')[0]
    const text = firstRow.text()
    expect(text).toContain('¥1,823,430')
    expect(text).toContain('¥310,009')
    expect(text).toContain('¥2,133,439')
  })

  it('当年行にはYTD注記を出し、他の年には出さない', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    const notes = wrapper.findAll('[data-testid="yearly-current-note"]')
    expect(notes).toHaveLength(1)
    expect(notes[0].text()).toContain('時点')
  })

  it('マイナスの確定利益は赤系クラスになる', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    const row2024 = wrapper.findAll('[data-testid="yearly-summary-row"]')[2]
    const cells = row2024.findAll('td')
    // 確定利益計セル（4列目）が赤
    expect(cells[3].classes()).toContain('text-red-600')
  })

  it('確定申告の参考値である旨の注記を表示する', () => {
    const wrapper = mount(YearlySummaryTable, { props: { rows } })
    expect(wrapper.text()).toContain('確定申告の参考値')
    expect(wrapper.text()).toContain('特定口座年間取引報告書')
  })

  it('当年のみ（データなし）でも1行描画する', () => {
    const only: YearlySummaryRow[] = [
      { year: 2026, realizedTotal: 0, dividendTotal: 0, confirmedTotal: 0, isCurrentYear: true },
    ]
    const wrapper = mount(YearlySummaryTable, { props: { rows: only } })
    expect(wrapper.findAll('[data-testid="yearly-summary-row"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="yearly-current-note"]').exists()).toBe(true)
  })
})
