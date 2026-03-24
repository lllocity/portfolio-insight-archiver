import { createRouter, createWebHistory } from 'vue-router'
import PortfolioPage from '@/pages/PortfolioPage.vue'
import HistoryPage from '@/pages/HistoryPage.vue'
import PromptPage from '@/pages/PromptPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/portfolio' },
    { path: '/portfolio', component: PortfolioPage },
    { path: '/history', component: HistoryPage },
    { path: '/prompt', component: PromptPage },
    { path: '/settings', component: SettingsPage }
  ]
})
