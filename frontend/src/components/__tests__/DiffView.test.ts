import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DiffView from '../DiffView.vue'
import type { SnapshotDiff } from '@/types/portfolio'

const emptyDiff: SnapshotDiff = {
  addedTickers: [],
  removedTickers: [],
  changed: [],
  valuationChange: '0',
  profitLossChange: '0'
}

describe('DiffView', () => {
  it('差分なしの場合は「前回と変化なし」を表示する', () => {
    const wrapper = mount(DiffView, { props: { diff: emptyDiff } })
    expect(wrapper.text()).toContain('前回と変化なし')
  })

  it('追加銘柄を表示する', () => {
    const diff: SnapshotDiff = {
      ...emptyDiff,
      addedTickers: ['7203', '6758'],
      valuationChange: '200000'
    }
    const wrapper = mount(DiffView, { props: { diff } })
    const added = wrapper.findAll('[data-testid="diff-added-ticker"]')
    expect(added).toHaveLength(2)
    expect(added[0].text()).toContain('7203')
  })

  it('除去銘柄を表示する', () => {
    const diff: SnapshotDiff = {
      ...emptyDiff,
      removedTickers: ['4689'],
      valuationChange: '-50000'
    }
    const wrapper = mount(DiffView, { props: { diff } })
    expect(wrapper.find('[data-testid="diff-removed-ticker"]').text()).toContain('4689')
  })
})
