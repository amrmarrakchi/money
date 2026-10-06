import { createRouter, createWebHistory } from 'vue-router'
import { restore, state } from '@/lib/store'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: 'Dashboard' } },
        { path: 'transactions', name: 'transactions', component: () => import('@/views/TransactionsView.vue'), meta: { title: 'Transactions' } },
        { path: 'categories', name: 'categories', component: () => import('@/views/CategoriesView.vue'), meta: { title: 'Categories' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

let restored = false
router.beforeEach(async (to) => {
  if (!restored) {
    restored = true
    await restore()
  }
  if (!to.meta.public && !state.user) return { name: 'login', query: to.fullPath !== '/' ? { next: to.fullPath } : {} }
  if (to.name === 'login' && state.user) return { name: 'dashboard' }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Money` : 'Money'
})
