import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'about', name: 'about', component: () => import('@/views/AboutView.vue') },
      { path: 'lodges', name: 'lodges', component: () => import('@/views/LodgesView.vue') },
      { path: 'lodges/:id', name: 'lodge-detail', component: () => import('@/views/LodgeDetailView.vue') },
      { path: 'rooms/:id', name: 'room-detail', component: () => import('@/views/RoomDetailView.vue') },
      {
        path: 'reserve/:roomId',
        name: 'reservation',
        component: () => import('@/views/ReservationView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'bookings',
        name: 'bookings',
        component: () => import('@/views/BookingsView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'bookings/:id',
        name: 'booking-detail',
        component: () => import('@/views/BookingDetailView.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      { path: 'login', name: 'login', component: () => import('@/views/LoginView.vue') },
      { path: 'register', name: 'register', component: () => import('@/views/RegisterView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Unauthenticated user hitting a protected route → send to login
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Already-authenticated user hitting login/register → send home
  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
