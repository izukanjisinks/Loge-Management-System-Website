import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api'
import type { GuestUser } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user  = ref<GuestUser | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref<string | null>(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!token.value)

  function _persist(t: string, u: GuestUser) {
    token.value = t
    user.value  = u
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  function _normaliseUser(apiUser: Record<string, unknown>): GuestUser {
    const fullName  = (apiUser.full_name as string) || ''
    const parts     = fullName.trim().split(' ')
    const firstName = parts[0] || ''
    const lastName  = parts.slice(1).join(' ') || ''
    return { ...apiUser, firstName, lastName, name: fullName } as GuestUser
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/guest/auth/login', { email, password })
    _persist(data.token, _normaliseUser(data.user ?? data.guest))
  }

  async function register(payload: Record<string, string>) {
    const { data } = await api.post('/guest/auth/register', payload)
    _persist(data.token, _normaliseUser(data.user ?? data.guest))
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
