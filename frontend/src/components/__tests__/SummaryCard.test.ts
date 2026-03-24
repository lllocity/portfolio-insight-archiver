import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SummaryCard from '../SummaryCard.vue'

describe('SummaryCard', () => {
  it('ラベルと値を表示する', () => {
    const wrapper = mount(SummaryCard, {
      props: { label: '総評価額', value: '¥5,000,000' }
    })
    expect(wrapper.text()).toContain('総評価額')
    expect(wrapper.find('[data-testid="summary-card-value"]').text()).toBe('¥5,000,000')
  })

  it('subValueがある場合は表示する', () => {
    const wrapper = mount(SummaryCard, {
      props: { label: '総損益', value: '¥300,000', subValue: '（+6.38%）' }
    })
    expect(wrapper.text()).toContain('（+6.38%）')
  })

  it('colorClassが適用される', () => {
    const wrapper = mount(SummaryCard, {
      props: { label: '損益', value: '+300,000', colorClass: 'text-green-600' }
    })
    expect(wrapper.find('[data-testid="summary-card-value"]').classes()).toContain('text-green-600')
  })
})
