import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { warehouseApi } from '@/api/warehouse'
import { ordersApi } from '@/api/orders'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { PageHeader } from '@/components/shared/page-header'

const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  warehouseId: z.string().uuid('Select a valid warehouse'),
  priority: z.enum(['STANDARD', 'HIGH', 'URGENT']),
  expectedDelivery: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
        unitPrice: z.coerce.number().positive('Price must be greater than 0'),
      }),
    )
    .min(1, 'At least one line item is required'),
})

type OrderFormData = z.infer<typeof orderSchema>

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

export function OrderCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)
  const addToast = useUIStore((s) => s.addToast)

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getWarehouses(),
    enabled: isAdmin(),
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema) as never,
    defaultValues: {
      customerId: '',
      warehouseId: isWarehouseStaff() ? (user?.warehouseId ?? '') : '',
      priority: 'STANDARD',
      expectedDelivery: '',
      notes: '',
      items: [{ productId: '', quantity: 1, unitPrice: 0.01 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchedItems = watch('items')

  const runningTotal = watchedItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unitPrice) || 0
    return sum + qty * price
  }, 0)

  const createMutation = useMutation({
    mutationFn: (data: OrderFormData) =>
      ordersApi.createOrder({
        ...data,
        expectedDelivery: data.expectedDelivery || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: (data) => {
      addToast('success', 'Order created')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate(`/orders/${data.orderId}`)
    },
    onError: () => {
      addToast('error', 'Failed to create order')
    },
  })

  const onSubmit = (data: OrderFormData) => createMutation.mutate(data)

  return (
    <div>
      <PageHeader title="Create Order" />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Order Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer ID <span className="text-red-500">*</span>
              </label>
              <input
                {...register('customerId')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter customer ID"
              />
              {errors.customerId && (
                <p className="mt-1 text-xs text-red-600">{errors.customerId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Warehouse <span className="text-red-500">*</span>
              </label>
              {isWarehouseStaff() ? (
                <input
                  {...register('warehouseId')}
                  readOnly
                  className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              ) : (
                <select
                  {...register('warehouseId')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select warehouse</option>
                  {warehousesQuery.isLoading && <option disabled>Loading…</option>}
                  {(warehousesQuery.data ?? []).map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.warehouseId && (
                <p className="mt-1 text-xs text-red-600">{errors.warehouseId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                {...register('priority')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="STANDARD">Standard</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Expected Delivery</label>
              <input
                type="date"
                {...register('expectedDelivery')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Optional notes"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Line Items</h2>
            <button
              type="button"
              onClick={() => append({ productId: '', quantity: 1, unitPrice: 0.01 })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus size={14} />
              Add Line
            </button>
          </div>

          {errors.items?.root && (
            <p className="mb-3 text-xs text-red-600">{errors.items.root.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => {
              const qty = Number(watchedItems[index]?.quantity) || 0
              const price = Number(watchedItems[index]?.unitPrice) || 0
              const lineTotal = qty * price

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_100px_120px_100px_40px] items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Product ID</label>
                    <input
                      {...register(`items.${index}.productId`)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Product ID"
                    />
                    {errors.items?.[index]?.productId && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {errors.items[index].productId.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Qty</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      {...register(`items.${index}.quantity`)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {errors.items[index].quantity.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Unit Price</label>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      {...register(`items.${index}.unitPrice`)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {errors.items?.[index]?.unitPrice && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {errors.items[index].unitPrice.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Total</label>
                    <p className="mt-1 py-1.5 text-sm font-medium text-gray-900">
                      {formatCurrency(lineTotal)}
                    </p>
                  </div>
                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Running Total</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(runningTotal)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
