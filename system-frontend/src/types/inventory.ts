export interface Product {
  productId: string
  sku: string
  name: string
  description: string | null
  category: string
  unitOfMeasure: string
  unitCost: number
  reorderThreshold: number
  version: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProductRequest {
  sku: string
  name: string
  description?: string
  category: string
  unitOfMeasure: string
  unitCost: number
  reorderThreshold: number
}

export interface UpdateProductRequest extends CreateProductRequest {
  version: number
}

export interface StockLevel {
  productId: string
  productName: string
  sku: string
  warehouseId: string
  warehouseName: string
  locationId: string
  locationCode: string
  onHand: number
  reserved: number
  available: number
  reorderThreshold: number
}

export interface LowStockItem {
  productId: string
  productName: string
  sku: string
  warehouseId: string
  warehouseName: string
  currentStock: number
  reorderThreshold: number
}

export interface StockAdjustRequest {
  productId: string
  locationId: string
  delta: number
  adjustmentType: string
  notes: string
  performedBy: string
}

export interface Batch {
  batchId: string
  productId: string
  batchNumber: string
  quantity: number
  status: 'ACTIVE' | 'RECALLED' | 'CONSUMED'
  manufactureDate: string | null
  expiryDate: string | null
  createdAt: string
}

export interface CreateBatchRequest {
  productId: string
  batchNumber: string
  quantity: number
  manufactureDate?: string
  expiryDate?: string
}
