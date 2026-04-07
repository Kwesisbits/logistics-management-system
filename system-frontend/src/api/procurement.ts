import api from './axios'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  Supplier,
  CreateSupplierRequest,
  PurchaseOrder,
  CreatePurchaseOrderRequest,
} from '@/types/procurement'

const BASE = import.meta.env.VITE_PROCUREMENT_SERVICE_URL

export const procurementApi = {
  getSuppliers: () =>
    api.get<Supplier[]>(`${BASE}/suppliers`).then((r) => r.data),

  getSupplier: (id: string) =>
    api.get<Supplier>(`${BASE}/suppliers/${id}`).then((r) => r.data),

  createSupplier: (data: CreateSupplierRequest) =>
    api.post<Supplier>(`${BASE}/suppliers`, data).then((r) => r.data),

  deactivateSupplier: (id: string) =>
    api.patch(`${BASE}/suppliers/${id}/deactivate`),

  getPurchaseOrders: (params?: PaginationParams & { supplierId?: string; status?: string; warehouseId?: string }) =>
    api.get<PaginatedResponse<PurchaseOrder>>(`${BASE}/purchase-orders`, { params }).then((r) => r.data),

  getPurchaseOrder: (poId: string) =>
    api.get<PurchaseOrder>(`${BASE}/purchase-orders/${poId}`).then((r) => r.data),

  createPurchaseOrder: (data: CreatePurchaseOrderRequest) =>
    api.post<PurchaseOrder>(`${BASE}/purchase-orders`, data).then((r) => r.data),

  submitPurchaseOrder: (poId: string) =>
    api.post<PurchaseOrder>(`${BASE}/purchase-orders/${poId}/submit`).then((r) => r.data),

  cancelPurchaseOrder: (poId: string, reason: string) =>
    api.post<PurchaseOrder>(`${BASE}/purchase-orders/${poId}/cancel`, { reason }).then((r) => r.data),

  updateDeliveryDate: (poId: string, expectedDelivery: string) =>
    api.patch<PurchaseOrder>(`${BASE}/purchase-orders/${poId}/delivery-date`, { expectedDelivery }).then((r) => r.data),
}
