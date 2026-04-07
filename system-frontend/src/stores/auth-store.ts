import { create } from 'zustand'
import type { AuthUser, RoleName } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
  hasPermission: (resource: string, action: string) => boolean
  hasRole: (role: RoleName) => boolean
  isAdmin: () => boolean
  isWarehouseStaff: () => boolean
  isViewer: () => boolean
  getWarehouseId: () => string | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,

  setAuth: (user, token) => set({ user, accessToken: token }),
  clearAuth: () => set({ user: null, accessToken: null }),

  isAuthenticated: () => get().accessToken !== null && get().user !== null,
  hasPermission: (resource, action) => {
    const perms = get().user?.permissions ?? []
    return perms.includes(`${resource}:${action}`)
  },
  hasRole: (role) => get().user?.roleName === role,
  isAdmin: () => get().user?.roleName === 'ADMIN',
  isWarehouseStaff: () => get().user?.roleName === 'WAREHOUSE_STAFF',
  isViewer: () => get().user?.roleName === 'VIEWER',
  getWarehouseId: () => get().user?.warehouseId ?? null,
}))
