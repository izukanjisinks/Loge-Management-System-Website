import axios from 'axios'
import { mockAdapter } from './mockAdapter'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api/v1',
  headers: { 'Content-Type': 'application/json' },
  ...(USE_MOCK ? { adapter: mockAdapter } : {}),
})

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — only redirect when the user had an active session (token expired).
// Public endpoints that return 401 due to missing org context must NOT trigger a logout.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url          = err.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/')
    const hadToken     = !!localStorage.getItem('token')
    if (err.response?.status === 401 && !isAuthEndpoint && hadToken) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api