import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'about', name: 'about', component: () => import('@/views/AboutView.vue') },
      { path: 'lodges', name: 'lodges', component: () => import('@/views/LodgesView.vue'), meta: { keepAlive: true } },
      { path: 'lodges/:id', name: 'lodge-detail', component: () => import('@/views/LodgeDetailView.vue'), meta: { keepAlive: true } },
      {
        path: 'lodges/:id/book/accommodation',
        name: 'accommodation-booking',
        component: () => import('@/views/AccommodationBookingView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'lodges/:id/book/events',
        name: 'event-booking',
        component: () => import('@/views/EventBookingView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'lodges/:id/book/meals',
        name: 'meal-booking',
        component: () => import('@/views/MealBookingView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'lodges/:id/corporate',
        name: 'corporate-booking',
        component: () => import('@/views/CorporateBookingView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'lodges/:id/individual',
        name: 'individual-booking',
        component: () => import('@/views/IndividualBookingView.vue'),
        meta: { requiresAuth: true },
      },
      { path: 'rooms', name: 'rooms', component: () => import('@/views/RoomsView.vue'), meta: { keepAlive: true } },
      { path: 'rooms/:id', name: 'room-detail', component: () => import('@/views/RoomDetailView.vue'), meta: { keepAlive: true } },
      { path: 'venues', name: 'venues', component: () => import('@/views/VenuesView.vue'), meta: { keepAlive: true } },
      { path: 'venues/:id', name: 'venue-detail', component: () => import('@/views/VenueDetailView.vue'), meta: { keepAlive: true } },
      { path: 'explore', name: 'explore', component: () => import('@/views/ExploreView.vue') },
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
      {
        path: 'account',
        name: 'account',
        component: () => import('@/views/AccountView.vue'),
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
})

router.afterEach(() => {
  const main = document.querySelector('main')
  if (main) main.scrollTop = 0
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
