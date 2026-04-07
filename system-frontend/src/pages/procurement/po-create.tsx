import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { procurementApi } from '@/api/procurement'
import { warehouseApi } from '@/api/warehouse'
import { inventoryApi } from '@/api/inventory'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

const poSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  expectedDelivery: z.string().min(1, 'Expected delivery date is required'),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        quantityOrdered: z.coerce.number().int().min(1, 'Min 1'),
        unitCost: z.coerce.number().min(0.01, 'Min $0.01'),
      }),
    )
    .min(1, 'At least one line item is required'),
})

type POFormValues = z.infer<typeof poSchema>

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)

export function PurchaseOrderCreatePage() {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: procurementApi.getSuppliers,
  })

  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseApi.getWarehouses,
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-po'],
    queryFn: () => inventoryApi.getProducts({ limit: 200 }),
  })

  const products = productsData?.data ?? []

  const createMutation = useMutation({
    mutationFn: procurementApi.createPurchaseOrder,
    onSuccess: (po) => {
      addToast('success', 'Purchase order created')
      navigate(`/procurement/purchase-orders/${po.purchaseOrderId}`)
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<POFormValues>({
    resolver: zodResolver(poSchema) as never,
    defaultValues: {
      supplierId: '',
      warehouseId: '',
      expectedDelivery: '',
      notes: '',
      items: [{ productId: '', quantityOrdered: 1, unitCost: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedItems = watch('items')
  const runningTotal = (watchedItems ?? []).reduce(
    (sum, item) =>
      sum +
      (Number(item.quantityOrdered) || 0) * (Number(item.unitCost) || 0),
    0,
  )

  const onSubmit = (data: POFormValues) => createMutation.mutate(data)

  if (suppliersLoading || warehousesLoading || productsLoading) {
    return <LoadingSpinner className="py-32" label="Loading form data…" />
  }

  return (
    <>
      <PageHeader title="Create Purchase Order" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-4xl space-y-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Supplier
            </label>
            <select
              {...register('supplierId')}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.supplierId ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select supplier…</option>
              {suppliers
                ?.filter((s) => s.active)
                .map((s) => (
                  <option key={s.supplierId} value={s.supplierId}>
                    {s.name}
                  </option>
                ))}
            </select>
            {errors.supplierId && (
              <p className="mt-1 text-xs text-red-600">
                {errors.supplierId.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Warehouse
            </label>
            <select
              {...register('warehouseId')}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.warehouseId ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">Select warehouse…</option>
              {warehouses
                ?.filter((w) => w.active)
                .map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.name}
                  </option>
                ))}
            </select>
            {errors.warehouseId && (
              <p className="mt-1 text-xs text-red-600">
                {errors.warehouseId.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Expected Delivery
            </label>
            <input
              type="date"
              {...register('expectedDelivery')}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.expectedDelivery ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.expectedDelivery && (
              <p className="mt-1 text-xs text-red-600">
                {errors.expectedDelivery.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <textarea
              {...register('notes')}
              rows={1}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Line Items</h3>
            <button
              type="button"
              onClick={() =>
                append({ productId: '', quantityOrdered: 1, unitCost: 0 })
              }
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus size={14} />
              Add Item
            </button>
          </div>

          {errors.items?.root && (
            <p className="mb-2 text-xs text-red-600">
              {errors.items.root.message}
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Product
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Unit Cost
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Line Total
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, index) => {
                  const qty =
                    Number(watchedItems?.[index]?.quantityOrdered) || 0
                  const cost = Number(watchedItems?.[index]?.unitCost) || 0
                  return (
                    <tr key={field.id}>
                      <td className="px-4 py-3">
                        <select
                          {...register(`items.${index}.productId`)}
                          className={`w-full rounded-lg border px-2 py-1.5 text-sm ${errors.items?.[index]?.productId ? 'border-red-400' : 'border-gray-300'}`}
                        >
                          <option value="">Select product…</option>
                          {products.map((p) => (
                            <option key={p.productId} value={p.productId}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          {...register(`items.${index}.quantityOrdered`)}
                          className={`w-24 rounded-lg border px-2 py-1.5 text-sm ${errors.items?.[index]?.quantityOrdered ? 'border-red-400' : 'border-gray-300'}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.unitCost`)}
                          className={`w-28 rounded-lg border px-2 py-1.5 text-sm ${errors.items?.[index]?.unitCost ? 'border-red-400' : 'border-gray-300'}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(qty * cost)}
                      </td>
                      <td className="px-4 py-3">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-4">
          <span className="text-sm font-medium text-gray-700">Total</span>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(runningTotal)}
          </span>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/procurement/purchase-orders')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending
              ? 'Creating…'
              : 'Create Purchase Order'}
          </button>
        </div>
      </form>
    </>
  )
}
