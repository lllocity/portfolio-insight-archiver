import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockPush = vi.fn()
vi.mock('@/router', () => ({ router: { push: mockPush } }))

const mockGetSession = vi.fn()
const mockSignOut = vi.fn()
const mockRpc = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOAuth: vi.fn(),
    },
    rpc: mockRpc,
  },
}))

// init() 後に onAuthStateChange コールバックを手動発火するヘルパー
async function triggerAuthChange(event: string, session: unknown) {
  const cb = mockOnAuthStateChange.mock.calls[0]?.[0]
  if (cb) await cb(event, session)
}

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()
    mockSignOut.mockReset().mockResolvedValue({})
    mockRpc.mockReset()
    mockOnAuthStateChange.mockReset().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  describe('init() - セッションなし', () => {
    it('未ログイン時は isAllowed が false のまま /forbidden に遷移しない', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })

      const { useAuthStore } = await import('@/stores/authStore')
      const store = useAuthStore()
      await store.init()

      expect(store.isAllowed).toBe(false)
      expect(mockRpc).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalledWith('/forbidden')
    })
  })

  describe('init() - 許可ユーザー', () => {
    it('allowed_emails に存在するユーザーは isAllowed が true になり /forbidden に遷移しない', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { email: 'allowed@gmail.com' } } },
      })
      mockRpc.mockResolvedValue({ data: true, error: null })

      const { useAuthStore } = await import('@/stores/authStore')
      const store = useAuthStore()
      await store.init()

      expect(store.isAllowed).toBe(true)
      expect(mockSignOut).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('init() - 不許可ユーザー', () => {
    it('allowed_emails に存在しないユーザーはサインアウトされ /forbidden へ遷移する', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { email: 'notallowed@gmail.com' } } },
      })
      mockRpc.mockResolvedValue({ data: false, error: null })

      const { useAuthStore } = await import('@/stores/authStore')
      const store = useAuthStore()
      await store.init()

      expect(store.isAllowed).toBe(false)
      expect(mockSignOut).toHaveBeenCalledOnce()
      expect(mockPush).toHaveBeenCalledWith('/forbidden')
    })

    it('RPC エラー時もサインアウトされ /forbidden へ遷移する', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { email: 'anyone@gmail.com' } } },
      })
      mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

      const { useAuthStore } = await import('@/stores/authStore')
      const store = useAuthStore()
      await store.init()

      expect(store.isAllowed).toBe(false)
      expect(mockSignOut).toHaveBeenCalledOnce()
      expect(mockPush).toHaveBeenCalledWith('/forbidden')
    })
  })

  describe('SIGNED_IN イベント（OAuth コールバック後）', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
    })

    it('許可ユーザーの SIGNED_IN で isAllowed が true になる', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      const { useAuthStore } = await import('@/stores/authStore')
      const store = useAuthStore()
      await store.init()

      await triggerAuthChange('SIGNED_IN', { user: { email: 'allowed@gmail.com' } })

      expect(store.isAllowed).toBe(true)
      expect(mockSignOut).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalledWith('/forbidden')
    })

    it('不許可ユーザーの SIGNED_IN でサインアウトされ /forbidden へ遷移する', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })

      const { useAuthStore } = await import('@/stores/authStore')
      const store = useAuthStore()
      await store.init()

      await triggerAuthChange('SIGNED_IN', { user: { email: 'notallowed@gmail.com' } })

      expect(store.isAllowed).toBe(false)
      expect(mockSignOut).toHaveBeenCalledOnce()
      expect(mockPush).toHaveBeenCalledWith('/forbidden')
    })
  })

  describe('SIGNED_OUT イベント', () => {
    it('SIGNED_OUT で isAllowed が false になり /login へ遷移する', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })

      const { useAuthStore } = await import('@/stores/authStore')
      const store = useAuthStore()
      await store.init()

      await triggerAuthChange('SIGNED_OUT', null)

      expect(store.isAllowed).toBe(false)
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})
