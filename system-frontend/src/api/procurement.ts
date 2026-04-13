import api from './axios'
import { serviceBases } from './service-bases'
import { normalizeSpringPage } from '@/types/api'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  Supplier,
  CreateSupplierRequest,
  PurchaseOrder,
  PurchaseOrderItem,
  CreatePurchaseOrderRequest,
} from '@/types/procurement'

const BASE = serviceBases.procurement

function mapSupplier(s: Record<string, unknown>): Supplier {
  return {
    supplierId: String(s.supplierId),
    name: String(s.name ?? ''),
    contactEmail: String(s.contactEmail ?? ''),
    contactPhone: s.contactPhone != null ? String(s.contactPhone) : null,
    street: s.street != null ? String(s.street) : null,
    city: s.city != null ? String(s.city) : null,
    country: s.country != null ? String(s.country) : null,
    leadTimeDays: Number(s.leadTimeDays ?? 0),
    paymentTerms: String(s.paymentTerms ?? ''),
    active: Boolean(s.active ?? s.isActive ?? true),
    createdAt: String(s.createdAt ?? ''),
  }
}

function mapPOItem(i: Record<string, unknown>): PurchaseOrderItem {
  return {
    itemId: String(i.poItemId ?? i.itemId ?? ''),
    productId: String(i.productId),
    quantityOrdered: Number(i.quantityOrdered ?? 0),
    quantityReceived: Number(i.quantityReceived ?? 0),
    unitCost: Number(i.unitCost ?? 0),
    lineTotal: Number(i.lineTotal ?? 0),
  }
}

function mapPurchaseOrder(raw: Record<string, unknown>): PurchaseOrder {
  const itemsRaw = raw.items as Record<string, unknown>[] | undefined
  const items = itemsRaw?.map(mapPOItem)
  return {
    purchaseOrderId: String(raw.purchaseOrderId),
    supplierId: String(raw.supplierId),
    warehouseId: String(raw.warehouseId),
    status: String(raw.status ?? 'DRAFTED').toUpperCase() as PurchaseOrder['status'],
    totalAmount: Number(raw.totalAmount ?? 0),
    expectedDelivery: raw.expectedDelivery != null ? String(raw.expectedDelivery) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    createdBy: String(raw.createdBy ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    items,
  }
}

export const procurementApi = {
  getSuppliers: (params?: PaginationParams): Promise<Supplier[]> =>
    api
      .get(`${BASE}/suppliers`, { params: { page: params?.page ?? 1, limit: params?.limit ?? 500 } })
      .then((r) => {
        const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
        return norm.data.map(mapSupplier)
      }),

  getSupplier: (id: string) =>
    api.get(`${BASE}/suppliers/${id}`).then((r) => mapSupplier(r.data as Record<string, unknown>)),

  createSupplier: (data: CreateSupplierRequest) =>
    api.post(`${BASE}/suppliers`, data).then((r) => mapSupplier(r.data as Record<string, unknown>)),

  deactivateSupplier: (id: string) => api.patch(`${BASE}/suppliers/${id}/deactivate`),

  getPurchaseOrders: (
    params?: PaginationParams & { supplierId?: string; status?: string; warehouseId?: string },
  ): Promise<PaginatedResponse<PurchaseOrder>> =>
    api.get(`${BASE}/purchase-orders`, { params }).then((r) => {
      const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
      return {
        data: norm.data.map(mapPurchaseOrder),
        pagination: norm.pagination,
      }
    }),

  getPurchaseOrder: (poId: string) =>
    api.get(`${BASE}/purchase-orders/${poId}`).then((r) => mapPurchaseOrder(r.data as Record<string, unknown>)),

  createPurchaseOrder: (data: CreatePurchaseOrderRequest) =>
    api.post(`${BASE}/purchase-orders`, data).then((r) => mapPurchaseOrder(r.data as Record<string, unknown>)),

  submitPurchaseOrder: (poId: string) =>
    api.post(`${BASE}/purchase-orders/${poId}/submit`).then((r) => mapPurchaseOrder(r.data as Record<string, unknown>)),

  cancelPurchaseOrder: (poId: string, reason: string) =>
    api.post(`${BASE}/purchase-orders/${poId}/cancel`, { reason }).then((r) =>
      mapPurchaseOrder(r.data as Record<string, unknown>),
    ),

  updateDeliveryDate: (poId: string, expectedDelivery: string) =>
    api
      .patch(`${BASE}/purchase-orders/${poId}/delivery-date`, { expectedDelivery })
      .then((r) => mapPurchaseOrder(r.data as Record<string, unknown>)),
}
