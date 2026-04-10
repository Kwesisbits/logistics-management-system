import axios from 'axios'
import useAuthStore from '../store/authStore'

const getEnv = (...keys) => keys.map((k) => import.meta.env[k]).find(Boolean)

const identityBaseUrl = getEnv('VITE_IDENTITY_SERVICE_URL', 'VITE_IDENTITY_API_URL')
const inventoryBaseUrl = getEnv('VITE_INVENTORY_SERVICE_URL', 'VITE_INVENTORY_API_URL')
const warehouseBaseUrl = getEnv('VITE_WAREHOUSE_SERVICE_URL', 'VITE_WAREHOUSE_API_URL')
const ordersBaseUrl = getEnv('VITE_ORDERS_SERVICE_URL', 'VITE_ORDERS_API_URL')
const procurementBaseUrl = getEnv('VITE_PROCUREMENT_SERVICE_URL', 'VITE_PROCUREMENT_API_URL')
const reportingBaseUrl = getEnv('VITE_REPORTING_SERVICE_URL', 'VITE_REPORTING_API_URL')

const axiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const method = (config.method || '').toLowerCase()
    if (['post', 'put', 'patch'].includes(method)) {
      config.headers['Idempotency-Key'] = crypto.randomUUID()
    }

    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

const parseApiError = (error) => {
  const envelope = error?.response?.data?.error
  if (envelope?.code && envelope?.message) {
    error.apiError = envelope
  }
  return error
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (!originalRequest) return Promise.reject(parseApiError(error))

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return axiosInstance(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await axios.post(
          `${identityBaseUrl}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const newToken = response.data.accessToken

        useAuthStore.getState().setAuth(
          newToken,
          useAuthStore.getState().user
        )

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(parseApiError(refreshError))
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(parseApiError(error))
  }
)

const createServiceApi = (baseURL) => {
  const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  })

  api.interceptors.request.use(
    (config) => axiosInstance.interceptors.request.handlers[0].fulfilled(config),
    (err) => Promise.reject(err)
  )
  api.interceptors.response.use(
    (response) => response,
    (error) => axiosInstance.interceptors.response.handlers[0].rejected(error)
  )

  return api
}

export const identityApi = createServiceApi(identityBaseUrl)
export const inventoryApi = createServiceApi(inventoryBaseUrl)
export const warehouseApi = createServiceApi(warehouseBaseUrl)
export const ordersApi = createServiceApi(ordersBaseUrl)
export const procurementApi = createServiceApi(procurementBaseUrl)
export const reportingApi = createServiceApi(reportingBaseUrl)

export default axiosInstance