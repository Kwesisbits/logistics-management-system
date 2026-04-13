export interface Warehouse {
  warehouseId: string
  name: string
  street: string | null
  city: string | null
  country: string | null
  type: string
  capacity: number
  active: boolean
  createdAt: string
}

export interface CreateWarehouseRequest {
  name: string
  street?: string
  city?: string
  country?: string
  type: string
  capacity: number
}

export interface StorageLocation {
  locationId: string
  warehouseId: string
  zone: string
  aisle: string
  shelf: string
  bin: string
  locationType: string
  maxCapacity: number
  currentOccupancy: number
  active: boolean
}

export interface CreateLocationRequest {
  zone: string
  aisle: string
  shelf: string
  bin: string
  locationType: string
  maxCapacity: number
}

export interface InboundReceipt {
  receiptId: string
  purchaseOrderId: string
  warehouseId: string
  receivedBy: string
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'PARTIAL'
  lines: ReceiptLine[]
  createdAt: string
}

export interface ReceiptLine {
  productId: string
  quantityExpected: number
  quantityReceived: number
  batchNumber: string | null
  expiryDate: string | null
}

export interface CreateReceiptRequest {
  purchaseOrderId: string
  warehouseId: string
  receivedBy: string
  lines: {
    productId: string
    locationId?: string
    quantityExpected: number
    quantityReceived: number
    batchNumber?: string
    expiryDate?: string
  }[]
}

export interface PutawayRequest {
  assignments: {
    productId: string
    locationId: string
    quantity: number
  }[]
}

export interface DispatchRequest {
  orderId: string
  warehouseId: string
  dispatchedBy: string
  items: {
    productId: string
    quantity: number
    fromLocationId: string
    batchId?: string
  }[]
  trackingReference?: string
}

export interface StockMovement {
  movementId: string
  productId: string
  fromLocationId: string | null
  toLocationId: string | null
  quantity: number
  movementType: string
  performedBy: string
  notes: string | null
  createdAt: string
}

export interface CreateMovementRequest {
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  movementType: string
  performedBy: string
  notes?: string
}
