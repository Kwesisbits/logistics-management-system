import api from './axios'
import { serviceBases } from './service-bases'
import { normalizeSpringPage } from '@/types/api'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  StockLevel,
  LowStockItem,
  StockAdjustRequest,
  Batch,
  CreateBatchRequest,
} from '@/types/inventory'

const BASE = serviceBases.inventory

function mapProduct(raw: Record<string, unknown>): Product {
  return {
    productId: String(raw.productId),
    sku: String(raw.sku ?? ''),
    name: String(raw.name ?? ''),
    description: raw.description != null ? String(raw.description) : null,
    category: String(raw.category ?? ''),
    unitOfMeasure: String(raw.unitOfMeasure ?? ''),
    unitCost: Number(raw.unitCost ?? 0),
    reorderThreshold: Number(raw.reorderThreshold ?? 0),
    version: Number(raw.version ?? 0),
    active: Boolean(raw.active ?? raw.isActive ?? true),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  }
}

function mapStockLevelRow(raw: Record<string, unknown>): StockLevel {
  const pid = String(raw.productId)
  const lid = String(raw.locationId)
  return {
    productId: pid,
    productName: String(raw.productName ?? `Product ${pid.slice(0, 8)}…`),
    sku: String(raw.sku ?? '—'),
    warehouseId: String(raw.warehouseId ?? ''),
    warehouseName: String(raw.warehouseName ?? '—'),
    locationId: lid,
    locationCode: String(raw.locationCode ?? lid.slice(0, 8)),
    onHand: Number(raw.quantityOnHand ?? raw.onHand ?? 0),
    reserved: Number(raw.quantityReserved ?? raw.reserved ?? 0),
    available: Number(raw.quantityAvailable ?? raw.available ?? 0),
    reorderThreshold: Number(raw.reorderThreshold ?? 0),
  }
}

function mapLowStockRow(raw: Record<string, unknown>): LowStockItem {
  const pid = String(raw.productId)
  return {
    productId: pid,
    productName: String(raw.productName ?? `Product ${pid.slice(0, 8)}…`),
    sku: String(raw.sku ?? '—'),
    warehouseId: String(raw.warehouseId ?? ''),
    warehouseName: String(raw.warehouseName ?? '—'),
    currentStock: Number(raw.quantityAvailable ?? raw.available ?? 0),
    reorderThreshold: Number(raw.reorderThreshold ?? 0),
  }
}

function mapBatchRow(raw: Record<string, unknown>): Batch {
  const st = String(raw.status ?? 'ACTIVE').toUpperCase()
  const status: Batch['status'] =
    st === 'RECALLED' || st === 'CONSUMED' ? (st as Batch['status']) : 'ACTIVE'
  return {
    batchId: String(raw.batchId),
    productId: String(raw.productId),
    batchNumber: String(raw.batchNumber ?? ''),
    quantity: Number(raw.quantity ?? 0),
    status,
    manufactureDate: raw.manufactureDate != null ? String(raw.manufactureDate) : null,
    expiryDate: raw.expiryDate != null ? String(raw.expiryDate) : null,
    createdAt: String(raw.createdAt ?? ''),
  }
}

export const inventoryApi = {
  getProducts: (params?: PaginationParams & { category?: string; search?: string }): Promise<PaginatedResponse<Product>> =>
    api.get(`${BASE}/products`, { params }).then((r) => {
      const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
      return { data: norm.data.map(mapProduct), pagination: norm.pagination }
    }),

  getProduct: (productId: string) =>
    api.get(`${BASE}/products/${productId}`).then((r) => mapProduct(r.data as Record<string, unknown>)),

  createProduct: (data: CreateProductRequest) =>
    api.post(`${BASE}/products`, data).then((r) => mapProduct(r.data as Record<string, unknown>)),

  updateProduct: (productId: string, data: UpdateProductRequest) =>
    api.put(`${BASE}/products/${productId}`, data).then((r) => mapProduct(r.data as Record<string, unknown>)),

  deleteProduct: (productId: string) => api.delete(`${BASE}/products/${productId}`),

  getStock: (params?: PaginationParams & { warehouseId?: string; productId?: string }): Promise<PaginatedResponse<StockLevel>> =>
    api.get(`${BASE}/stock`, { params }).then((r) => {
      const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
      return { data: norm.data.map(mapStockLevelRow), pagination: norm.pagination }
    }),

  getProductStock: (productId: string) =>
    api.get(`${BASE}/stock/product/${productId}`).then((r) => {
      const d = r.data
      const arr = Array.isArray(d) ? d : []
      return arr.map((row) => mapStockLevelRow(row as Record<string, unknown>))
    }),

  getLowStock: (warehouseId?: string): Promise<LowStockItem[]> =>
    api
      .get(`${BASE}/stock/low-stock`, { params: { warehouseId } })
      .then((r) => {
        const d = r.data
        const arr = Array.isArray(d) ? d : (d as { content?: unknown[] })?.content ?? []
        return arr.map((row) => mapLowStockRow(row as Record<string, unknown>))
      })
      .catch(() => []),

  adjustStock: (data: StockAdjustRequest) =>
    api.post(`${BASE}/stock/adjust`, data).then((r) => r.data),

  getBatches: (params?: PaginationParams & { productId?: string; status?: string }): Promise<PaginatedResponse<Batch>> =>
    api.get(`${BASE}/batches`, { params }).then((r) => {
      const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
      return { data: norm.data.map(mapBatchRow), pagination: norm.pagination }
    }),

  createBatch: (data: CreateBatchRequest) =>
    api.post<Batch>(`${BASE}/batches`, data).then((r) => r.data),

  updateBatchStatus: (batchId: string, status: string) =>
    api.patch<Batch>(`${BASE}/batches/${batchId}/status`, { status }).then((r) => r.data),
}
