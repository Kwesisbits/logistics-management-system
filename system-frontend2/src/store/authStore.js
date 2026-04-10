import { create } from 'zustand'

const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,

  setAuth: (accessToken, user) => set({ accessToken, user }),

  clearAuth: () => set({ accessToken: null, user: null }),

  isAuthenticated: () => Boolean(useAuthStore.getState().accessToken),
  hasPermission: (resource, action) => {
    const permissions = useAuthStore.getState().user?.permissions ?? []
    return permissions.includes(`${resource}:${action}`)
  },
  isAdmin: () => useAuthStore.getState().user?.roleName === 'ADMIN',
  isWarehouseStaff: () => useAuthStore.getState().user?.roleName === 'WAREHOUSE_STAFF',
  getWarehouseId: () => useAuthStore.getState().user?.warehouseId ?? null,
}))

export default useAuthStore