import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api'

export const useAuthStore = defineStore('auth', () => {
  const user  = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!token.value)

  // Normalise the API user shape into what the UI expects.
  // Server returns full_name; UI uses firstName / lastName / name.
  function _normaliseUser(apiUser) {
    const parts     = (apiUser.full_name || '').trim().split(' ')
    const firstName = parts[0] || ''
    const lastName  = parts.slice(1).join(' ') || ''
    return { ...apiUser, firstName, lastName, name: apiUser.full_name }
  }

  function _setToken(t) {
    token.value = t
    localStorage.setItem('token', t)
  }

  function _setUser(u) {
    user.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  async function login(email, password) {
    const { data } = await api.post('/web/auth/login', { email, password })
    _setToken(data.token)
    // Use inline user if the server sends it; otherwise fetch from profile
    if (data.user) {
      _setUser(_normaliseUser(data.user))
    } else {
      await fetchUser()
    }
  }

  async function register(payload) {
    const { data } = await api.post('/web/auth/register', payload)
    _setToken(data.token)
    if (data.user) {
      _setUser(_normaliseUser(data.user))
    } else {
      await fetchUser()
    }
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const { data } = await api.get('/web/profile')
      _setUser(_normaliseUser(data))
    } catch {
      logout()
    }
  }

  async function updateProfile(payload) {
    const { data } = await api.put('/web/profile', payload)
    _setUser(_normaliseUser(data))
  }

  async function changePassword(oldPassword, newPassword) {
    await api.put('/web/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    })
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    user, token, isAuthenticated,
    login, register, fetchUser,
    updateProfile, changePassword,
    logout,
  }
})
