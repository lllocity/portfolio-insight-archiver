import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CsvImportForm from '../CsvImportForm.vue'

vi.mock('@/api/csvApi', () => ({
  importCsv: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }),
  },
}))

function makeFile(name: string): File {
  return new File(['dummy'], name, { type: 'text/csv' })
}

describe('CsvImportForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ファイル未選択時は「選択されていません」と表示し、インポートボタンが disabled', () => {
    const wrapper = mount(CsvImportForm)
    expect(wrapper.text()).toContain('選択されていません')
    const btn = wrapper.find('[data-testid="csv-import-button"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('1ファイル選択時はファイル名を表示する', async () => {
    const wrapper = mount(CsvImportForm)
    const input = wrapper.find('[data-testid="csv-import-file-input"]')
    const file = makeFile('portfolio_p1.csv')
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    expect(wrapper.text()).toContain('portfolio_p1.csv')
    const btn = wrapper.find('[data-testid="csv-import-button"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('2ファイル選択時は「2 ファイル選択中」と表示する', async () => {
    const wrapper = mount(CsvImportForm)
    const input = wrapper.find('[data-testid="csv-import-file-input"]')
    const files = [makeFile('portfolio_p1.csv'), makeFile('portfolio_p2.csv')]
    Object.defineProperty(input.element, 'files', { value: files, configurable: true })
    await input.trigger('change')
    expect(wrapper.text()).toContain('2 ファイル選択中')
    const btn = wrapper.find('[data-testid="csv-import-button"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('インポートボタン押下時に選択中の全ファイルを importCsv に渡す', async () => {
    const { importCsv } = await import('@/api/csvApi')
    vi.mocked(importCsv).mockResolvedValue({
      success: true,
      snapshotDate: '2026-07-03',
      importedCount: 60,
      warnings: null,
    })

    const wrapper = mount(CsvImportForm)
    const input = wrapper.find('[data-testid="csv-import-file-input"]')
    const files = [makeFile('portfolio_p1.csv'), makeFile('portfolio_p2.csv')]
    Object.defineProperty(input.element, 'files', { value: files, configurable: true })
    await input.trigger('change')

    await wrapper.find('[data-testid="csv-import-button"]').trigger('click')
    await vi.waitFor(() => expect(importCsv).toHaveBeenCalledOnce())
    expect(vi.mocked(importCsv).mock.calls[0][0]).toHaveLength(2)
  })
})
