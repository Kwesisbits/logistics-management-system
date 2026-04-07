export interface InventorySnapshot {
  productId: string
  productName: string
  sku: string
  warehouseId: string
  warehouseName: string
  onHand: number
  reserved: number
  available: number
  snapshotDate: string
}

export interface MovementHistory {
  movementId: string
  productId: string
  productName: string
  movementType: string
  quantity: number
  warehouseId: string
  createdAt: string
}

export interface MovementTrend {
  date: string
  inbound: number
  outbound: number
  internal: number
}

export interface OrderSummary {
  totalOrders: number
  byStatus: Record<string, number>
  totalRevenue: number
  averageOrderValue: number
}

export interface FulfilmentRate {
  rate: number
  fulfilled: number
  total: number
  period: string
}
