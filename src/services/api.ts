import axios, { AxiosError } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { showError, showSuccess } from '../utils/toast'
import { ERROR_MESSAGES } from '../utils/messages'
import { navigateToLogin } from '../utils/navigation'
import type {
  UserApiResponse,
  LoginApiResponse,
  OpsOrder,
  OpsRolePrefix,
  DashboardSummary,
  DeliveryPartner,
  AdminOrderEditPayload,
} from '../types'
import type { DeviceTokenData } from '../utils/notifications'

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || 'http://127.0.0.1:8001/api'

console.log('📡 [API Config] API_BASE_URL:', API_BASE_URL)

const ROLE_PREFIX_KEY = 'opsRolePrefix'
const ALLOWED_ROLES = new Set(['superadmin', 'delivery_partner'])

export const roleToPrefix = (userType?: string): OpsRolePrefix =>
  userType === 'superadmin' ? 'admin' : 'delivery'

export const getStoredRolePrefix = async (): Promise<OpsRolePrefix> => {
  const stored = await AsyncStorage.getItem(ROLE_PREFIX_KEY)
  return stored === 'admin' ? 'admin' : 'delivery'
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

const handleTokenExpiration = async () => {
  try {
    const { useAuthStore } = await import('../store/authStore')
    await useAuthStore.getState().logout()
    navigateToLogin('Dashboard')
    showError(ERROR_MESSAGES.SESSION_EXPIRED)
  } catch (err) {
    console.error('Error during token expiration handling:', err)
  }
}

api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase() || ''
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const successMessage = response.data?.message
      if (successMessage && typeof successMessage === 'string') {
        showSuccess(successMessage)
      }
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status !== 400 && !(error.response?.status === 401 && originalRequest?.url?.includes('/refresh_token/'))) {
      showError(getErrorMessage(error))
    }

    const isAuthRequest =
      originalRequest?.url?.includes('/login/') ||
      originalRequest?.url?.includes('/register/')
    const isTokenError = error.response?.status === 401

    if (isTokenError && originalRequest && !originalRequest._retry && !isAuthRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true
      const refreshToken = await AsyncStorage.getItem('refreshToken')

      if (!refreshToken) {
        processQueue(error, null)
        isRefreshing = false
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', ROLE_PREFIX_KEY])
        await handleTokenExpiration()
        return Promise.reject(error)
      }

      try {
        const prefix = await getStoredRolePrefix()
        const response = await axios.post(
          `${API_BASE_URL}/${prefix}/refresh_token/`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        )
        const { access_token, refresh_token: newRefreshToken } =
          response.data.data || response.data

        if (!access_token) throw new Error('No access token in refresh response')

        await AsyncStorage.setItem('authToken', access_token)
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken)
        }
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        processQueue(null, access_token)
        isRefreshing = false
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', ROLE_PREFIX_KEY])
        await handleTokenExpiration()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const errorData = error.response.data
      if (typeof errorData === 'string') return errorData
      const serverMessage =
        errorData?.errors || errorData?.message || errorData?.error || errorData?.detail
      if (serverMessage) {
        if (typeof serverMessage === 'object' && !Array.isArray(serverMessage)) {
          const firstError = Object.values(serverMessage)[0]
          if (Array.isArray(firstError) && firstError.length > 0) return String(firstError[0])
          if (typeof firstError === 'string') return firstError
        }
        if (Array.isArray(serverMessage) && serverMessage.length > 0) {
          return String(serverMessage[0])
        }
        return String(serverMessage)
      }
      if (error.response.status === 401) return ERROR_MESSAGES.UNAUTHORIZED
      if (error.response.status === 403) return ERROR_MESSAGES.FORBIDDEN
      if (error.response.status === 404) return ERROR_MESSAGES.NOT_FOUND
      return `Server error (${error.response.status})`
    }
    if (error.code === 'ECONNREFUSED') return ERROR_MESSAGES.CONNECTION_ERROR
    if (error.code === 'ETIMEDOUT') return ERROR_MESSAGES.TIMEOUT_ERROR
    if (error.message?.includes('Network Error')) return ERROR_MESSAGES.NETWORK_ERROR
    return ERROR_MESSAGES.CONNECTION_ERROR
  }
  if (error instanceof Error) return error.message
  return ERROR_MESSAGES.UNKNOWN_ERROR
}

const normalizeUser = (raw: any): UserApiResponse => ({
  id: String(raw.id),
  username: raw.username || raw.email || '',
  email: raw.email || '',
  first_name: raw.first_name,
  last_name: raw.last_name,
  phone: raw.phone_number || raw.phone,
  phone_number: raw.phone_number || raw.phone,
  user_type: raw.user_type,
})

const unwrapList = <T,>(data: any): T[] => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.results)) return data.data.results
  return []
}

export const authService = {
  login: async (
    email: string,
    password: string
  ): Promise<{ user: UserApiResponse; token: string; rolePrefix: OpsRolePrefix }> => {
    // AuthViewSet does not enforce role at login; we gate by user_type after.
    const response = await api.post<LoginApiResponse>('/delivery/login/', {
      email,
      password,
    })
    const payload = response.data.data || (response.data as any)
    const access_token = payload.access_token
    const refresh_token = payload.refresh_token
    let user = payload.user ? normalizeUser(payload.user) : undefined

    if (!access_token) {
      throw new Error('Access token not received from server.')
    }

    await AsyncStorage.setItem('authToken', String(access_token))
    if (refresh_token) {
      await AsyncStorage.setItem('refreshToken', String(refresh_token))
    }

    if (!user) {
      const me = await api.get('/delivery/user/')
      const raw = me.data.data || me.data
      user = normalizeUser(raw)
    }

    if (!ALLOWED_ROLES.has(user.user_type || '')) {
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', ROLE_PREFIX_KEY])
      const err = new Error(ERROR_MESSAGES.OPS_APP_ONLY) as Error & { skipInterceptor?: boolean }
      throw err
    }

    const rolePrefix = roleToPrefix(user.user_type)
    await AsyncStorage.setItem(ROLE_PREFIX_KEY, rolePrefix)

    return { user, token: String(access_token), rolePrefix }
  },

  registerDeviceToken: async (deviceData: DeviceTokenData): Promise<void> => {
    const prefix = await getStoredRolePrefix()
    await api.post(`/${prefix}/device-tokens/register/`, deviceData)
  },

  logout: async (): Promise<void> => {
    try {
      const prefix = await getStoredRolePrefix()
      try {
        await api.delete(`/${prefix}/device-tokens/delete-all/`)
      } catch {
        // ignore
      }
      await api.post(`/${prefix}/logout/`)
    } catch {
      // ignore logout API failures
    } finally {
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', ROLE_PREFIX_KEY])
    }
  },

  getProfile: async (): Promise<UserApiResponse> => {
    const prefix = await getStoredRolePrefix()
    const response = await api.get(`/${prefix}/profile/me/`)
    const raw = response.data.data || response.data
    return normalizeUser(raw)
  },
}

export const opsService = {
  getDashboard: async (): Promise<DashboardSummary> => {
    const prefix = await getStoredRolePrefix()
    const response = await api.get(`/${prefix}/dashboard/summary/`)
    return response.data.data || response.data
  },

  getOrders: async (params?: {
    status?: string
    payment_status?: string
    order_number?: string
    search?: string
  }): Promise<OpsOrder[]> => {
    const prefix = await getStoredRolePrefix()
    const response = await api.get(`/${prefix}/orders/`, { params })
    return unwrapList<OpsOrder>(response.data)
  },

  getOrderById: async (id: number): Promise<OpsOrder> => {
    const prefix = await getStoredRolePrefix()
    const response = await api.get(`/${prefix}/orders/${id}/`)
    return response.data.data || response.data
  },

  updateOrderStatus: async (
    id: number,
    statusValue: string,
    notes?: string
  ): Promise<OpsOrder> => {
    const prefix = await getStoredRolePrefix()
    const response = await api.post(`/${prefix}/orders/${id}/update-status/`, {
      status: statusValue,
      notes: notes || '',
    })
    return response.data.data || response.data
  },

  updatePayment: async (
    id: number,
    payload: { status: string; notes?: string; amount_collected?: string; transaction_id?: string }
  ): Promise<OpsOrder> => {
    const prefix = await getStoredRolePrefix()
    const response = await api.patch(`/${prefix}/orders/${id}/payment/`, payload)
    return response.data.data || response.data
  },

  editOrder: async (id: number, payload: AdminOrderEditPayload): Promise<OpsOrder> => {
    const response = await api.patch(`/admin/orders/${id}/`, payload)
    return response.data.data || response.data
  },

  assignRider: async (id: number, delivery_partner_id: number | null): Promise<OpsOrder> => {
    const response = await api.post(`/admin/orders/${id}/assign-rider/`, {
      delivery_partner_id,
    })
    return response.data.data || response.data
  },

  getDeliveryPartners: async (): Promise<DeliveryPartner[]> => {
    const response = await api.get('/admin/delivery-partners/')
    return unwrapList<DeliveryPartner>(response.data)
  },
}

export default api
