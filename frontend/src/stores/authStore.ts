import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { router } from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)
  const isAllowed = ref(false)

  async function checkAllowlist(): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_email_allowed')
    if (error) return false
    return data === true
  }

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user ?? null

    if (session?.user?.email) {
      isAllowed.value = await checkAllowlist()
      if (!isAllowed.value) {
        await signOut()
        loading.value = false
        router.push('/forbidden')
        return
      }
    }

    loading.value = false

    supabase.auth.onAuthStateChange(async (_event, session) => {
      user.value = session?.user ?? null
      if (_event === 'SIGNED_OUT') {
        isAllowed.value = false
        router.push('/login')
      }
      if (_event === 'SIGNED_IN' && session?.user?.email && !isAllowed.value) {
        isAllowed.value = await checkAllowlist()
        if (!isAllowed.value) {
          await signOut()
          router.push('/forbidden')
        }
      }
    })
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    isAllowed.value = false
  }

  return { user, loading, isAllowed, init, signInWithGoogle, signOut }
})
