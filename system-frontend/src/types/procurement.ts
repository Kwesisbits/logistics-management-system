export type POStatus = 'DRAFTED' | 'SUBMITTED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED'

export interface Supplier {
  supplierId: string
  name: string
  contactEmail: string
  contactPhone: string | null
  street: string | null
  city: string | null
  country: string | null
  leadTimeDays: number
  paymentTerms: string
  active: boolean
  createdAt: string
}

export interface CreateSupplierRequest {
  name: string
  contactEmail: string
  contactPhone?: string
  street?: string
  city?: string
  country?: string
  leadTimeDays: number
  paymentTerms: string
}

export interface PurchaseOrder {
  purchaseOrderId: string
  supplierId: string
  supplierName?: string
  warehouseId: string
  status: POStatus
  totalAmount: number
  expectedDelivery: string | null
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  itemId: string
  productId: string
  productName?: string
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
  lineTotal: number
}

export interface CreatePurchaseOrderRequest {
  supplierId: string
  warehouseId: string
  expectedDelivery: string
  notes?: string
  items: {
    productId: string
    quantityOrdered: number
    unitCost: number
  }[]
}
