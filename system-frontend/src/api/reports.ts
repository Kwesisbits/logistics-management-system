import api from './axios'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  InventorySnapshot,
  MovementHistory,
  MovementTrend,
  OrderSummary,
  FulfilmentRate,
} from '@/types/reports'

const BASE = import.meta.env.VITE_REPORTING_SERVICE_URL

export const reportsApi = {
  getInventorySnapshot: (params?: PaginationParams & { warehouseId?: string }) =>
    api.get<PaginatedResponse<InventorySnapshot>>(`${BASE}/inventory/snapshot`, { params }).then((r) => r.data),

  getLowStockSummary: (warehouseId?: string) =>
    api.get(`${BASE}/inventory/low-stock`, { params: { warehouseId } }).then((r) => r.data),

  getMovementHistory: (params?: PaginationParams & { productId?: string; warehouseId?: string; from?: string; to?: string }) =>
    api.get<PaginatedResponse<MovementHistory>>(`${BASE}/movements/history`, { params }).then((r) => r.data),

  getMovementTrends: (params?: { warehouseId?: string; from?: string; to?: string }) =>
    api.get<MovementTrend[]>(`${BASE}/movements/trends`, { params }).then((r) => r.data),

  getOrderSummary: (params?: { warehouseId?: string; from?: string; to?: string }) =>
    api.get<OrderSummary>(`${BASE}/orders/summary`, { params }).then((r) => r.data),

  getFulfilmentRate: (params?: { warehouseId?: string; from?: string; to?: string }) =>
    api.get<FulfilmentRate>(`${BASE}/orders/fulfilment-rate`, { params }).then((r) => r.data),

  exportReport: (reportType: string, params?: { warehouseId?: string; from?: string; to?: string }) =>
    api.get(`${BASE}/export/${reportType}`, { params, responseType: 'blob' }).then((r) => r.data),
}
