import api from './axios'
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

const BASE = import.meta.env.VITE_WAREHOUSE_SERVICE_URL

export const warehouseApi = {
  getWarehouses: () =>
    api.get<Warehouse[]>(`${BASE}/warehouses`).then((r) => r.data),

  getWarehouse: (id: string) =>
    api.get<Warehouse>(`${BASE}/warehouses/${id}`).then((r) => r.data),

  createWarehouse: (data: CreateWarehouseRequest) =>
    api.post<Warehouse>(`${BASE}/warehouses`, data).then((r) => r.data),

  getLocations: (warehouseId: string, params?: { locationType?: string; available?: boolean }) =>
    api.get<StorageLocation[]>(`${BASE}/warehouses/${warehouseId}/locations`, { params }).then((r) => r.data),

  getLocation: (locationId: string) =>
    api.get<StorageLocation>(`${BASE}/locations/${locationId}`).then((r) => r.data),

  createLocation: (warehouseId: string, data: CreateLocationRequest) =>
    api.post<StorageLocation>(`${BASE}/warehouses/${warehouseId}/locations`, data).then((r) => r.data),

  getReceipts: (params?: PaginationParams & { warehouseId?: string; status?: string }) =>
    api.get<PaginatedResponse<InboundReceipt>>(`${BASE}/receipts`, { params }).then((r) => r.data),

  createReceipt: (data: CreateReceiptRequest) =>
    api.post<InboundReceipt>(`${BASE}/receipts`, data).then((r) => r.data),

  confirmReceipt: (receiptId: string) =>
    api.post<InboundReceipt>(`${BASE}/receipts/${receiptId}/confirm`).then((r) => r.data),

  rejectReceipt: (receiptId: string, reason: string) =>
    api.post<InboundReceipt>(`${BASE}/receipts/${receiptId}/reject`, { reason }).then((r) => r.data),

  putaway: (receiptId: string, data: PutawayRequest) =>
    api.post(`${BASE}/receipts/${receiptId}/putaway`, data),

  createDispatch: (data: DispatchRequest) =>
    api.post(`${BASE}/dispatch`, data).then((r) => r.data),

  confirmDispatch: (dispatchId: string) =>
    api.post(`${BASE}/dispatch/${dispatchId}/confirm`),

  getMovements: (params?: PaginationParams & { productId?: string; warehouseId?: string; movementType?: string }) =>
    api.get<PaginatedResponse<StockMovement>>(`${BASE}/movements`, { params }).then((r) => r.data),

  createMovement: (data: CreateMovementRequest) =>
    api.post<StockMovement>(`${BASE}/movements`, data).then((r) => r.data),
}
