import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TotalReturnPanel from '../TotalReturnPanel.vue'

const labels = {
  unrealized: { label: '含み損益（現在）', subValue: '現在の保有分' },
  realized: { label: '実現損益（当年・税引前）', subValue: '売却で確定' },
  dividend: { label: '受取配当（当年・税引後）', subValue: '入金済み' },
}

const baseProps = {
  title: '年間トータルリターン（2026年）',
  subtitle: '2026/01/01〜2026/08/14 時点',
  unrealized: 2_000_000,
  realized: 1_823_430,
  dividend: 310_009,
  labels,
}

describe('TotalReturnPanel', () => {
  it('合計＝含み＋実現＋配当を表示する', () => {
    const wrapper = mount(TotalReturnPanel, { props: baseProps })
    // 2,000,000 + 1,823,430 + 310,009 = 4,133,439
    expect(wrapper.find('[data-testid="total-return-total"]').text()).toBe('¥4,133,439')
  })

  it('title と 3内訳ラベル・subtitle を表示する', () => {
    const wrapper = mount(TotalReturnPanel, { props: baseProps })
    const text = wrapper.text()
    expect(text).toContain('年間トータルリターン（2026年）')
    expect(text).toContain('含み損益（現在）')
    expect(text).toContain('実現損益（当年・税引前）')
    expect(text).toContain('受取配当（当年・税引後）')
    expect(wrapper.find('[data-testid="total-return-subtitle"]').text()).toContain('2026/01/01〜2026/08/14')
  })

  it('note を表示する（error が無いとき）', () => {
    const wrapper = mount(TotalReturnPanel, { props: { ...baseProps, note: '※含み損益は現在の全保有分' } })
    expect(wrapper.find('[data-testid="total-return-note"]').text()).toContain('現在の全保有分')
  })

  it('error があれば inline エラーを表示し、note は出さない', () => {
    const wrapper = mount(TotalReturnPanel, {
      props: { ...baseProps, note: '※注記', error: '取得に失敗しました' },
    })
    expect(wrapper.find('[data-testid="total-return-error"]').text()).toContain('取得に失敗しました')
    expect(wrapper.find('[data-testid="total-return-note"]').exists()).toBe(false)
  })

  it('含み損益が null（ポートフォリオ未取込）でも実現＋配当で合計を出す', () => {
    const wrapper = mount(TotalReturnPanel, {
      props: { ...baseProps, unrealized: null, realized: 100_000, dividend: 50_000 },
    })
    expect(wrapper.find('[data-testid="total-return-total"]').text()).toBe('¥150,000')
  })

  it('マイナス合計は赤系クラスになる', () => {
    const wrapper = mount(TotalReturnPanel, {
      props: { ...baseProps, unrealized: -3_000_000, realized: 100_000, dividend: 50_000 },
    })
    expect(wrapper.find('[data-testid="total-return-total"]').classes()).toContain('text-red-600')
  })
})
