import api from './axios'
import { serviceBases } from './service-bases'
import { normalizeSpringPage } from '@/types/api'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  Warehouse,
  CreateWarehouseRequest,
  StorageLocation,
  CreateLocationRequest,
  InboundReceipt,
  CreateReceiptRequest,
  PutawayRequest,
  DispatchRequest,
  StockMovement,
  CreateMovementRequest,
} from '@/types/warehouse'

const BASE = serviceBases.warehouse

function mapWarehouseRow(w: Record<string, unknown>): Warehouse {
  return {
    warehouseId: String(w.warehouseId),
    name: String(w.name ?? ''),
    street: w.street != null ? String(w.street) : null,
    city: w.city != null ? String(w.city) : null,
    country: w.country != null ? String(w.country) : null,
    type: String(w.type ?? ''),
    capacity: Number(w.capacity ?? 0),
    active: Boolean(w.active ?? w.isActive ?? true),
    createdAt: String(w.createdAt ?? ''),
  }
}

function mapLocationRow(l: Record<string, unknown>): StorageLocation {
  return {
    locationId: String(l.locationId),
    warehouseId: String(l.warehouseId),
    zone: String(l.zone ?? ''),
    aisle: String(l.aisle ?? ''),
    shelf: String(l.shelf ?? ''),
    bin: String(l.bin ?? ''),
    locationType: String(l.locationType ?? ''),
    maxCapacity: Number(l.maxCapacity ?? 0),
    currentOccupancy: Number(l.currentOccupancy ?? 0),
    active: Boolean(l.active ?? l.isActive ?? true),
  }
}

function mapReceiptLine(line: Record<string, unknown>) {
  return {
    productId: String(line.productId),
    quantityExpected: Number(line.qtyExpected ?? line.quantityExpected ?? 0),
    quantityReceived: Number(line.qtyReceived ?? line.quantityReceived ?? 0),
    batchNumber: line.batchNumber != null ? String(line.batchNumber) : null,
    expiryDate: line.expiryDate != null ? String(line.expiryDate) : null,
  }
}

function mapInboundReceipt(raw: Record<string, unknown>): InboundReceipt {
  const linesRaw = (raw.lines as Record<string, unknown>[]) ?? []
  const status = String(raw.status ?? 'PENDING').toUpperCase()
  const st: InboundReceipt['status'] =
    status === 'CONFIRMED' || status === 'REJECTED' || status === 'PARTIAL'
      ? status
      : 'PENDING'
  return {
    receiptId: String(raw.receiptId),
    purchaseOrderId: String(raw.purchaseOrderId),
    warehouseId: String(raw.warehouseId),
    receivedBy: String(raw.receivedBy),
    status: st,
    lines: linesRaw.map(mapReceiptLine),
    createdAt: String(raw.createdAt ?? ''),
  }
}

function mapMovementRow(m: Record<string, unknown>): StockMovement {
  return {
    movementId: String(m.movementId),
    productId: String(m.productId),
    fromLocationId: m.fromLocationId != null ? String(m.fromLocationId) : null,
    toLocationId: m.toLocationId != null ? String(m.toLocationId) : null,
    quantity: Number(m.quantity ?? 0),
    movementType: String(m.movementType ?? ''),
    performedBy: String(m.performedBy ?? ''),
    notes: m.notes != null ? String(m.notes) : null,
    createdAt: String(m.createdAt ?? ''),
  }
}

export const warehouseApi = {
  getWarehouses: (params?: PaginationParams): Promise<Warehouse[]> =>
    api
      .get(`${BASE}/warehouses`, {
        params: { page: params?.page ?? 1, limit: params?.limit ?? 500 },
      })
      .then((r) => {
        const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
        return norm.data.map(mapWarehouseRow)
      }),

  getWarehouse: (id: string) =>
    api.get(`${BASE}/warehouses/${id}`).then((r) => mapWarehouseRow(r.data as Record<string, unknown>)),

  createWarehouse: (data: CreateWarehouseRequest) =>
    api.post(`${BASE}/warehouses`, data).then((r) => mapWarehouseRow(r.data as Record<string, unknown>)),

  getLocations: (warehouseId: string, params?: { locationType?: string; available?: boolean }) =>
    api
      .get(`${BASE}/locations`, { params: { warehouseId, ...params } })
      .then((r) => {
        const d = r.data
        const arr = Array.isArray(d) ? d : []
        return arr.map((row) => mapLocationRow(row as Record<string, unknown>))
      }),

  getLocation: (locationId: string) =>
    api.get(`${BASE}/locations/${locationId}`).then((r) => mapLocationRow(r.data as Record<string, unknown>)),

  createLocation: (warehouseId: string, data: CreateLocationRequest) =>
    api.post(`${BASE}/locations/${warehouseId}`, data).then((r) => mapLocationRow(r.data as Record<string, unknown>)),

  getReceipts: (params?: PaginationParams & { warehouseId?: string; status?: string }): Promise<PaginatedResponse<InboundReceipt>> =>
    api.get(`${BASE}/receipts`, { params }).then((r) => {
      const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
      return {
        data: norm.data.map(mapInboundReceipt),
        pagination: norm.pagination,
      }
    }),

  createReceipt: (data: CreateReceiptRequest) => {
    const body = {
      purchaseOrderId: data.purchaseOrderId,
      warehouseId: data.warehouseId,
      receivedBy: data.receivedBy,
      lines: data.lines.map((l) => ({
        productId: l.productId,
        locationId: l.locationId ?? null,
        qtyExpected: l.quantityExpected,
        qtyReceived: l.quantityReceived,
      })),
    }
    return api.post(`${BASE}/receipts`, body).then((r) => mapInboundReceipt(r.data as Record<string, unknown>))
  },

  confirmReceipt: (receiptId: string) =>
    api.post(`${BASE}/receipts/${receiptId}/confirm`).then((r) => mapInboundReceipt(r.data as Record<string, unknown>)),

  rejectReceipt: (receiptId: string, reason: string) =>
    api.post(`${BASE}/receipts/${receiptId}/reject`, { reason }).then((r) => mapInboundReceipt(r.data as Record<string, unknown>)),

  putaway: (receiptId: string, data: PutawayRequest) =>
    api.post(`${BASE}/receipts/${receiptId}/putaway`, data),

  createDispatch: (data: DispatchRequest) =>
    api.post(`${BASE}/dispatch`, data).then((r) => r.data),

  confirmDispatch: (dispatchId: string) =>
    api.post(`${BASE}/dispatch/${dispatchId}/confirm`),

  getMovements: (params?: PaginationParams & { productId?: string; warehouseId?: string; movementType?: string }): Promise<PaginatedResponse<StockMovement>> =>
    api.get(`${BASE}/movements`, { params }).then((r) => {
      const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
      return {
        data: norm.data.map(mapMovementRow),
        pagination: norm.pagination,
      }
    }),

  createMovement: (data: CreateMovementRequest) =>
    api.post<StockMovement>(`${BASE}/movements`, data).then((r) => r.data),
}
