import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api/v1',
  headers: { 'Content-Type': 'application/json' },
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
    const url            = err.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/')
    const hadToken       = !!localStorage.getItem('token')
    if (err.response?.status === 401 && !isAuthEndpoint && hadToken) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const redirect = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?redirect=${redirect}&reason=session`
    }
    return Promise.reject(err)
  }
)

// Public client — no auth header, for endpoints that are open to guests
export const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export default api
