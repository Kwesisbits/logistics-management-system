import api from './axios'
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

const BASE = import.meta.env.VITE_INVENTORY_SERVICE_URL

export const inventoryApi = {
  getProducts: (params?: PaginationParams & { category?: string; search?: string }) =>
    api.get<PaginatedResponse<Product>>(`${BASE}/products`, { params }).then((r) => r.data),

  getProduct: (productId: string) =>
    api.get<Product>(`${BASE}/products/${productId}`).then((r) => r.data),

  createProduct: (data: CreateProductRequest) =>
    api.post<Product>(`${BASE}/products`, data).then((r) => r.data),

  updateProduct: (productId: string, data: UpdateProductRequest) =>
    api.put<Product>(`${BASE}/products/${productId}`, data).then((r) => r.data),

  deleteProduct: (productId: string) =>
    api.delete(`${BASE}/products/${productId}`),

  getStock: (params?: PaginationParams & { warehouseId?: string; productId?: string }) =>
    api.get<PaginatedResponse<StockLevel>>(`${BASE}/stock`, { params }).then((r) => r.data),

  getProductStock: (productId: string) =>
    api.get<StockLevel[]>(`${BASE}/stock/${productId}`).then((r) => r.data),

  getLowStock: (warehouseId?: string) =>
    api.get<LowStockItem[]>(`${BASE}/stock/low-stock`, { params: { warehouseId } }).then((r) => r.data),

  adjustStock: (data: StockAdjustRequest) =>
    api.post(`${BASE}/stock/adjust`, data).then((r) => r.data),

  getBatches: (params?: PaginationParams & { productId?: string; status?: string }) =>
    api.get<PaginatedResponse<Batch>>(`${BASE}/batches`, { params }).then((r) => r.data),

  createBatch: (data: CreateBatchRequest) =>
    api.post<Batch>(`${BASE}/batches`, data).then((r) => r.data),

  updateBatchStatus: (batchId: string, status: string) =>
    api.patch<Batch>(`${BASE}/batches/${batchId}/status`, { status }).then((r) => r.data),
}
