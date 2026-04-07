import axios from 'axios'
import { useAuthStore } from '@/stores/auth-store'

const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const method = config.method?.toUpperCase()
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    config.headers['Idempotency-Key'] = crypto.randomUUID()
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
