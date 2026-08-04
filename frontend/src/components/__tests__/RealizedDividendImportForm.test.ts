import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RealizedDividendImportForm from '../RealizedDividendImportForm.vue'
import { importRealizedPnl, importDividends } from '@/api/totalReturnImportApi'

vi.mock('@/api/totalReturnImportApi', () => ({
  importRealizedPnl: vi.fn(),
  importDividends: vi.fn(),
}))

function makeFile(name: string): File {
  return new File(['dummy'], name, { type: 'text/csv' })
}

async function selectFile(wrapper: ReturnType<typeof mount>, name: string) {
  const input = wrapper.find('[data-testid="tr-import-file-input"]')
  Object.defineProperty(input.element, 'files', { value: [makeFile(name)], configurable: true })
  await input.trigger('change')
}

describe('RealizedDividendImportForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ファイル未選択時はインポートボタンが disabled', () => {
    const wrapper = mount(RealizedDividendImportForm)
    expect(wrapper.find('[data-testid="tr-import-button"]').attributes('disabled')).toBeDefined()
  })

  it('デフォルト（実現損益）で importRealizedPnl を呼び、成功結果を表示する', async () => {
    vi.mocked(importRealizedPnl).mockResolvedValue({
      success: true, importedCount: 25, skipped: 0, dateRange: { from: '2026-04-01', to: '2026-08-04' },
    })
    const wrapper = mount(RealizedDividendImportForm)
    await selectFile(wrapper, 'DOMESTIC_STOCK_x.csv')
    await wrapper.find('[data-testid="tr-import-button"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(importRealizedPnl).toHaveBeenCalledTimes(1)
    expect(importDividends).not.toHaveBeenCalled()
    const success = wrapper.find('[data-testid="tr-import-success"]')
    expect(success.text()).toContain('25 件')
    expect(success.text()).toContain('2026-04-01〜2026-08-04')
  })

  it('配当に切り替えると importDividends を呼ぶ', async () => {
    vi.mocked(importDividends).mockResolvedValue({
      success: true, importedCount: 31, skipped: 1, dateRange: { from: '2026-04-01', to: '2026-08-04' },
    })
    const wrapper = mount(RealizedDividendImportForm)
    // 種別トグルの「配当金」ボタン（2番目）を押す
    const kindButtons = wrapper.findAll('[data-testid="tr-import-kind"]')
    await kindButtons[1].trigger('click')
    await selectFile(wrapper, 'DISTRIBUTION_x.csv')
    await wrapper.find('[data-testid="tr-import-button"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(importDividends).toHaveBeenCalledTimes(1)
    expect(importRealizedPnl).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="tr-import-success"]').text()).toContain('1 件スキップ')
  })

  it('失敗時はエラーメッセージを表示し imported を emit しない', async () => {
    vi.mocked(importRealizedPnl).mockRejectedValue(new Error('実現損益の取り込みに失敗しました'))
    const wrapper = mount(RealizedDividendImportForm)
    await selectFile(wrapper, 'x.csv')
    await wrapper.find('[data-testid="tr-import-button"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('[data-testid="tr-import-error"]').text()).toContain('実現損益の取り込みに失敗しました')
    expect(wrapper.emitted('imported')).toBeUndefined()
  })

  it('種別を切り替えると選択済みファイルと結果をリセットする', async () => {
    const wrapper = mount(RealizedDividendImportForm)
    await selectFile(wrapper, 'keep.csv')
    expect(wrapper.text()).toContain('keep.csv')
    const kindButtons = wrapper.findAll('[data-testid="tr-import-kind"]')
    await kindButtons[1].trigger('click')
    expect(wrapper.text()).toContain('選択されていません')
  })
})
