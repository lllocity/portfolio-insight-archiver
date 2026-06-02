import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
import PortfolioPage from '@/pages/PortfolioPage.vue'
import HistoryPage from '@/pages/HistoryPage.vue'
import PromptPage from '@/pages/PromptPage.vue'
import LoginPage from '@/pages/LoginPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage, meta: { public: true } },
    { path: '/', redirect: '/portfolio' },
    { path: '/portfolio', component: PortfolioPage },
    { path: '/history', component: HistoryPage },
    { path: '/prompt', component: PromptPage }
  ]
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return '/login'
})
