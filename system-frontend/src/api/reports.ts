import { serviceBases } from './service-bases'
import api from './axios'
import { normalizeSpringPage } from '@/types/api'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  InventorySnapshot,
  MovementHistory,
  MovementTrend,
  OrderSummary,
  FulfilmentRate,
} from '@/types/reports'

const BASE = serviceBases.reporting

function mapInventorySnapshot(raw: Record<string, unknown>): InventorySnapshot {
  const pid = String(raw.productId)
  const wid = String(raw.warehouseId)
  return {
    productId: pid,
    productName: String(raw.productName ?? `Product ${pid.slice(0, 8)}…`),
    sku: String(raw.sku ?? '—'),
    warehouseId: wid,
    warehouseName: String(raw.warehouseName ?? `Warehouse ${wid.slice(0, 8)}…`),
    onHand: Number(raw.totalQuantity ?? raw.onHand ?? 0),
    reserved: Number(raw.reservedQuantity ?? raw.reserved ?? 0),
    available: Number(raw.availableQuantity ?? raw.available ?? 0),
    snapshotDate: String(raw.snapshotAt ?? raw.snapshotDate ?? ''),
  }
}

function mapMovementHistoryRow(raw: Record<string, unknown>): MovementHistory {
  const pid = String(raw.productId)
  return {
    movementId: String(raw.aggId ?? raw.movementId ?? ''),
    productId: pid,
    productName: String(raw.productName ?? `Product ${pid.slice(0, 8)}…`),
    movementType: String(raw.movementType ?? 'AGGREGATE'),
    quantity: Number(raw.totalInbound ?? raw.totalOutbound ?? raw.quantity ?? 0),
    warehouseId: String(raw.warehouseId ?? ''),
    createdAt: String(raw.createdAt ?? raw.periodStart ?? ''),
  }
}

export const reportsApi = {
  getInventorySnapshot: (
    params?: PaginationParams & { warehouseId?: string; productId?: string },
  ): Promise<PaginatedResponse<InventorySnapshot>> =>
    api.get(`${BASE}/inventory/snapshot`, { params }).then((r) => {
      const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
      return {
        data: norm.data.map(mapInventorySnapshot),
        pagination: norm.pagination,
      }
    }),

  getLowStockSummary: (warehouseId?: string) =>
    api.get(`${BASE}/inventory/low-stock`, { params: { warehouseId } }).then((r) => r.data),

  getMovementHistory: (
    params?: PaginationParams & { productId?: string; warehouseId?: string; from?: string; to?: string },
  ): Promise<PaginatedResponse<MovementHistory>> =>
    api.get(`${BASE}/movements/history`, { params }).then((r) => {
      const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
      return {
        data: norm.data.map(mapMovementHistoryRow),
        pagination: norm.pagination,
      }
    }),

  getMovementTrends: (params?: { warehouseId?: string; from?: string; to?: string }) =>
    api.get<MovementTrend[]>(`${BASE}/movements/trends`, { params }).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : []
    }),

  getOrderSummary: (params?: { warehouseId?: string; from?: string; to?: string }) =>
    api.get<OrderSummary>(`${BASE}/orders/summary`, { params }).then((r) => r.data as OrderSummary),

  getFulfilmentRate: (params?: { warehouseId?: string; from?: string; to?: string }) =>
    api.get<FulfilmentRate>(`${BASE}/orders/fulfilment-rate`, { params }).then((r) => r.data as FulfilmentRate),

  exportReport: (reportType: string, params?: { warehouseId?: string; from?: string; to?: string }) =>
    api.get(`${BASE}/export/${reportType}`, { params, responseType: 'blob' }).then((r) => r.data),
}
