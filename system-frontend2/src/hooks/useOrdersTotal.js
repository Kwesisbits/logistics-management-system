import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { ordersApi } from '../services/axiosInstance'

/**
 * Total order count (from API pagination). Refetches when any `queryKey: ['orders']` query is invalidated (e.g. after create).
 */
export function useOrdersTotalQuery() {
  const user = useAuthStore((s) => s.user)
  const warehouseId = user?.roleName === 'WAREHOUSE_STAFF' ? user?.warehouseId : undefined

  return useQuery({
    queryKey: ['orders', 'count', warehouseId],
    queryFn: async () => {
      const r = await ordersApi.get('/', {
        params: { page: 1, limit: 1, warehouseId },
      })
      const total = r.data?.pagination?.total
      if (typeof total === 'number') return total
      return Array.isArray(r.data?.data) ? r.data.data.length : 0
    },
    staleTime: 15_000,
  })
}
