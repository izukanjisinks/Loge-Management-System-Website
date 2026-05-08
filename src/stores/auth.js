import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api'

export const useAuthStore = defineStore('auth', () => {
  const user  = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!token.value)

  function _persist(t, u) {
    token.value = t
    user.value  = u
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  // Normalise the user object from the API into the shape the UI expects.
  // The API returns full_name; the UI uses firstName / lastName / name.
  function _normaliseUser(apiUser) {
    const parts     = (apiUser.full_name || '').trim().split(' ')
    const firstName = parts[0] || ''
    const lastName  = parts.slice(1).join(' ') || ''
    return { ...apiUser, firstName, lastName, name: apiUser.full_name }
  }

  async function login(email, password) {
    const { data } = await api.post('/guest/auth/login', { email, password })
    _persist(data.token, _normaliseUser(data.guest))
  }

  async function register(payload) {
    const { data } = await api.post('/guest/auth/register', payload)
    _persist(data.token, _normaliseUser(data.guest))
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const { data } = await api.get('/guest/me')
      user.value = _normaliseUser(data)
      localStorage.setItem('user', JSON.stringify(user.value))
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { user, token, isAuthenticated, login, register, fetchUser, logout }
})