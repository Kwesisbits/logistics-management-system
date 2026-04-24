import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import { inventoryApi, ordersApi, warehouseApi } from '../../services/axiosInstance'
import { springPageItems } from '../../utils/apiNormalize'

const emptyLine = () => ({ id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: 0 })

/** Order service only accepts STANDARD | HIGH | URGENT (see OrderService.createOrder). */
const PRIORITY_VALUES = ['STANDARD', 'HIGH', 'URGENT']

export default function CreateOrder() {
  const navigate = useNavigate()
  const user     = useAuthStore((s) => s.user)
  const isAdmin  = useAuthStore((s) => s.isAdmin())
  const isStaff  = user?.roleName === 'WAREHOUSE_STAFF'
  const queryClient = useQueryClient()

  // Form fields — customerId must be a UUID (see CreateOrderRequest)
  const [customerId,       setCustomerId]       = useState('')
  const [warehouseId,      setWarehouseId]      = useState(isStaff ? String(user?.warehouseId ?? '') : '')
  const [priority,         setPriority]         = useState('STANDARD')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes,            setNotes]            = useState('')
  const [lines,            setLines]            = useState([emptyLine()])

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [errors,     setErrors]     = useState({})
  const [apiError,   setApiError]   = useState('')

  const { data: productData } = useQuery({
    queryKey: ['products', 'lookup'],
    queryFn: async () => {
      const response = await inventoryApi.get('/products', { params: { page: 1, limit: 200 } })
      return response.data
    },
    staleTime: 30_000,
  })

  const { data: warehouseData } = useQuery({
    queryKey: ['warehouses', 'lookup'],
    queryFn: async () => {
      const response = await warehouseApi.get('/warehouses', { params: { page: 1, limit: 200 } })
      return response.data
    },
    staleTime: 30_000,
  })

  const products = springPageItems(productData)

  const warehouses = springPageItems(warehouseData)

  useEffect(() => {
    if (user?.userId) {
      setCustomerId((c) => (c.trim() ? c : String(user.userId)))
    }
  }, [user?.userId])

  useEffect(() => {
    if (isStaff && user?.warehouseId) {
      setWarehouseId(String(user.warehouseId))
    }
  }, [isStaff, user?.warehouseId])

  const createOrder = useMutation({
    mutationFn: (payload) => ordersApi.post('/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Running total
  const runningTotal = lines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unitPrice)), 0)

  function updateLine(id, field, value) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      // Auto-fill unit price when product is selected
      if (field === 'productId') {
        const product = products.find((p) => String(p.productId) === String(value))
        updated.unitPrice = product != null ? Number(product.unitCost) : 0
      }
      if (field === 'quantity') {
        updated.quantity = Number(value)
      }
      if (field === 'unitPrice') {
        updated.unitPrice = Number(value)
      }
      return updated
    }))
  }

  function addLine()        { setLines((prev) => [...prev, emptyLine()]) }
  function removeLine(id)   { setLines((prev) => prev.filter((l) => l.id !== id)) }

  function validate() {
    const e = {}
    const cid = customerId.trim()
    if (!cid) e.customerId = 'Customer ID is required'
    if (!warehouseId) e.warehouseId = 'Select a warehouse'
    if (!PRIORITY_VALUES.includes(priority)) e.priority = 'Select a priority'
    if (lines.length === 0) e.lines = 'Add at least one item'
    lines.forEach((l, i) => {
      if (!l.productId) e[`line_${i}_product`] = 'Select a product'
      const q = Number(l.quantity)
      if (!Number.isFinite(q) || q < 1) e[`line_${i}_qty`] = 'Qty must be at least 1'
      const up = Number(l.unitPrice)
      if (!Number.isFinite(up) || up <= 0) e[`line_${i}_price`] = 'Price must be greater than 0'
    })
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setApiError('')
    setSubmitting(true)

    const payload = {
      customerId: customerId.trim(),
      warehouseId: String(warehouseId),
      priority,
      expectedDelivery: expectedDelivery || undefined,
      notes: notes || undefined,
      items: lines.map((l) => ({
        productId: String(l.productId),
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      })),
    }

    try {
      await createOrder.mutateAsync(payload)
      navigate('/orders')
    } catch (err) {
      console.error('Order create error:', err)
      const apiErr = err?.apiError ?? err?.response?.data
      const code = apiErr?.code
      const msg = apiErr?.message || (err?.response?.data?.details ? JSON.stringify(err.response.data.details) : null)
      
      if (code === 'INSUFFICIENT_STOCK') {
        setApiError('Not enough stock for one or more selected items.')
      } else if (code === 'VALIDATION_ERROR') {
        setApiError(msg || 'Validation failed. Check your inputs.')
      } else if (code === 'NOT_FOUND') {
        setApiError(msg || 'Resource not found.')
      } else if (msg) {
        setApiError(msg)
      } else {
        setApiError('Failed to create order. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-dark-base dark:text-white">Create Order</h2>
          <p className="text-sm text-gray-400 mt-0.5">Fill in the details below to create a new order</p>
        </div>
      </div>

      <div className="app-card p-6 space-y-5">

        {/* Customer + Warehouse row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
              Warehouse <span className="text-red-400">*</span>
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="app-input w-full"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.name || w.warehouseId}
                </option>
              ))}
            </select>
          </div>