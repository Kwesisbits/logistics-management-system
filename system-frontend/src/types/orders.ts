export type OrderStatus = 'DRAFT' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'FAILED'
export type OrderPriority = 'STANDARD' | 'HIGH' | 'URGENT'

export interface Order {
  orderId: string
  customerId: string
  warehouseId: string
  status: OrderStatus
  priority: OrderPriority
  totalAmount: number
  expectedDelivery: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  orderItemId: string
  orderId: string
  productId: string
  productName?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  status?: string
}

export interface OrderStatusHistory {
  id: string
  orderId: string
  fromStatus: string | null
  toStatus: string
  changedBy: string | null
  reason: string | null
  createdAt: string
}

export interface CreateOrderRequest {
  customerId: string
  warehouseId: string
  priority: OrderPriority
  expectedDelivery?: string
  notes?: string
  items: {
    productId: string
    quantity: number
    unitPrice: number
  }[]
}

export interface CancelOrderRequest {
  reason: string
  cancelledBy: string
}

export interface AssignOrderRequest {
  staffUserId: string
  assignedBy: string
  notes?: string
}
