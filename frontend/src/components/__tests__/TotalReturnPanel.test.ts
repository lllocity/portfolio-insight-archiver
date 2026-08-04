import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TotalReturnPanel from '../TotalReturnPanel.vue'

describe('TotalReturnPanel', () => {
  const baseProps = {
    unrealized: 2_000_000,
    realized: 1_823_430,
    dividend: 310_009,
    coverageRange: { from: '2025-04-01', to: '2026-08-04' },
  }

  it('合計＝含み損益＋実現損益＋受取配当を表示する', () => {
    const wrapper = mount(TotalReturnPanel, { props: baseProps })
    // 2,000,000 + 1,823,430 + 310,009 = 4,133,439
    expect(wrapper.find('[data-testid="total-return-total"]').text()).toBe('¥4,133,439')
  })

  it('3内訳のラベルに税引前/税引後を併記する', () => {
    const wrapper = mount(TotalReturnPanel, { props: baseProps })
    const text = wrapper.text()
    expect(text).toContain('含み損益（未実現）')
    expect(text).toContain('実現損益（税引前）')
    expect(text).toContain('受取配当（税引後）')
  })

  it('集計期間を YYYY/MM/DD で表示する', () => {
    const wrapper = mount(TotalReturnPanel, { props: baseProps })
    expect(wrapper.find('[data-testid="total-return-coverage"]').text()).toContain('2025/04/01〜2026/08/04')
  })

  it('coverageRange が null なら未取込の注記を出し、期間は出さない', () => {
    const wrapper = mount(TotalReturnPanel, {
      props: { unrealized: 500_000, realized: 0, dividend: 0, coverageRange: null },
    })
    expect(wrapper.find('[data-testid="total-return-no-data"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="total-return-coverage"]').exists()).toBe(false)
    // 含み損益のみでも合計は表示
    expect(wrapper.find('[data-testid="total-return-total"]').text()).toBe('¥500,000')
  })

  it('含み損益が null（ポートフォリオ未取込）でも実現＋配当で合計を出す', () => {
    const wrapper = mount(TotalReturnPanel, {
      props: { unrealized: null, realized: 100_000, dividend: 50_000, coverageRange: { from: '2026-01-01', to: '2026-06-30' } },
    })
    expect(wrapper.find('[data-testid="total-return-total"]').text()).toBe('¥150,000')
  })

  it('error があれば inline エラーを表示し、未取込注記は出さない', () => {
    const wrapper = mount(TotalReturnPanel, {
      props: { unrealized: 500_000, realized: 0, dividend: 0, coverageRange: null, error: '実現損益の取得に失敗しました' },
    })
    expect(wrapper.find('[data-testid="total-return-error"]').text()).toContain('実現損益の取得に失敗しました')
    expect(wrapper.find('[data-testid="total-return-no-data"]').exists()).toBe(false)
  })

  it('マイナス合計は赤系クラスになる', () => {
    const wrapper = mount(TotalReturnPanel, {
      props: { unrealized: -3_000_000, realized: 100_000, dividend: 50_000, coverageRange: null },
    })
    expect(wrapper.find('[data-testid="total-return-total"]').classes()).toContain('text-red-600')
  })
})
