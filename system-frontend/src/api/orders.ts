import api from './axios'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type {
  Order,
  OrderItem,
  OrderStatusHistory,
  CreateOrderRequest,
  CancelOrderRequest,
  AssignOrderRequest,
} from '@/types/orders'

const BASE = import.meta.env.VITE_ORDERS_SERVICE_URL

export const ordersApi = {
  getOrders: (params?: PaginationParams & { status?: string; warehouseId?: string; priority?: string }) =>
    api.get<PaginatedResponse<Order>>(BASE, { params }).then((r) => r.data),

  getOrder: (orderId: string) =>
    api.get<Order>(`${BASE}/${orderId}`).then((r) => r.data),

  createOrder: (data: CreateOrderRequest) =>
    api.post<Order>(BASE, data).then((r) => r.data),

  submitOrder: (orderId: string) =>
    api.post<Order>(`${BASE}/${orderId}/submit`).then((r) => r.data),

  cancelOrder: (orderId: string, data: CancelOrderRequest) =>
    api.post<Order>(`${BASE}/${orderId}/cancel`, data).then((r) => r.data),

  assignOrder: (orderId: string, data: AssignOrderRequest) =>
    api.post(`${BASE}/${orderId}/assign`, data),

  getOrderHistory: (orderId: string) =>
    api.get<OrderStatusHistory[]>(`${BASE}/${orderId}/history`).then((r) => r.data),

  getOrderItems: (orderId: string) =>
    api.get<OrderItem[]>(`${BASE}/${orderId}/items`).then((r) => r.data),

  getAssignedOrders: (userId: string) =>
    api.get<Order[]>(`${BASE}/assigned-to/${userId}`).then((r) => r.data),
}
