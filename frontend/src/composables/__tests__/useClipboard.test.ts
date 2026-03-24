import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useClipboard } from '../useClipboard'

describe('useClipboard', () => {
  const { copy } = useClipboard()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('navigator.clipboardが利用可能な場合はwriteTextを呼び出す', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true
    })

    await copy('テストテキスト')

    expect(mockWriteText).toHaveBeenCalledWith('テストテキスト')
  })

  it('navigator.clipboardが利用不可の場合はexecCommandフォールバックを使用する', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true
    })
    const execCommandMock = vi.fn().mockReturnValue(true)
    document.execCommand = execCommandMock

    await copy('フォールバックテキスト')

    expect(execCommandMock).toHaveBeenCalledWith('copy')
  })
})
