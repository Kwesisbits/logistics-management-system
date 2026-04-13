import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { warehouseApi } from '@/api/warehouse'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { cn } from '@/lib/utils'
import type { Warehouse } from '@/types/warehouse'

const lineSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantityExpected: z.coerce
    .number({ message: 'Required' })
    .int()
    .positive('Must be positive'),
  quantityReceived: z.coerce
    .number({ message: 'Required' })
    .int()
    .nonnegative('Must be 0 or more'),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
})

const receiptSchema = z.object({
  purchaseOrderId: z.string().min(1, 'Purchase Order ID is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  receivedBy: z.string().min(1, 'Received by is required'),
  lines: z.array(lineSchema).min(1, 'At least one line item is required'),
})

type ReceiptFormValues = z.infer<typeof receiptSchema>

export function ReceiptCreatePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)

  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getWarehouses(),
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema) as never,
    defaultValues: {
      purchaseOrderId: '',
      warehouseId: '',
      receivedBy: user?.userId ?? '',
      lines: [
        { productId: '', quantityExpected: undefined as unknown as number, quantityReceived: undefined as unknown as number, batchNumber: '', expiryDate: '' },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  const createMutation = useMutation({
    mutationFn: warehouseApi.createReceipt,
    onSuccess: () => {
      addToast('success', 'Receipt created successfully')
      navigate('/warehouse/receipts')
    },
    onError: (err: unknown) => {
      addToast('error', getApiErrorMessage(err))
    },
  })

  const onSubmit = (data: ReceiptFormValues) => {
    const payload = {
      ...data,
      lines: data.lines.map((line) => ({
        productId: line.productId,
        quantityExpected: line.quantityExpected,
        quantityReceived: line.quantityReceived,
        ...(line.batchNumber ? { batchNumber: line.batchNumber } : {}),
        ...(line.expiryDate ? { expiryDate: line.expiryDate } : {}),
      })),
    }
    createMutation.mutate(payload)
  }

  if (warehousesLoading) {
    return <LoadingSpinner className="py-32" label="Loading…" />
  }

  const inputClass = (hasError: boolean) =>
    cn(
      'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      hasError ? 'border-red-400' : 'border-gray-300',
    )

  return (
    <div>
      <PageHeader
        title="Receive Goods"
        description="Record a new inbound receipt"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Receipt Details</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Purchase Order ID</label>
              <input
                {...register('purchaseOrderId')}
                placeholder="Enter PO ID"
                className={inputClass(!!errors.purchaseOrderId)}
              />
              {errors.purchaseOrderId && (
                <p className="mt-1 text-xs text-red-600">{errors.purchaseOrderId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Warehouse</label>
              <select
                {...register('warehouseId')}
                className={inputClass(!!errors.warehouseId)}
              >
                <option value="">Select warehouse…</option>
                {(warehouses ?? []).map((w: Warehouse) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.name}
                  </option>
                ))}
              </select>
              {errors.warehouseId && (
                <p className="mt-1 text-xs text-red-600">{errors.warehouseId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Received By</label>
              <input
                {...register('receivedBy')}
                readOnly
                className={cn(inputClass(!!errors.receivedBy), 'bg-gray-50')}
              />
              {errors.receivedBy && (
                <p className="mt-1 text-xs text-red-600">{errors.receivedBy.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
            <button
              type="button"
              onClick={() =>
                append({
                  productId: '',
                  quantityExpected: undefined as unknown as number,
                  quantityReceived: undefined as unknown as number,
                  batchNumber: '',
                  expiryDate: '',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus size={14} />
              Add Line
            </button>
          </div>

          {errors.lines?.root && (
            <p className="mb-3 text-xs text-red-600">{errors.lines.root.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => {
              const lineErrors = errors.lines?.[index]
              return (
                <div
                  key={field.id}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      Line {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Product ID</label>
                      <input
                        {...register(`lines.${index}.productId`)}
                        placeholder="Product ID"
                        className={inputClass(!!lineErrors?.productId)}
                      />
                      {lineErrors?.productId && (
                        <p className="mt-1 text-xs text-red-600">{lineErrors.productId.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600">Qty Expected</label>
                      <input
                        type="number"
                        {...register(`lines.${index}.quantityExpected`)}
                        placeholder="0"
                        className={inputClass(!!lineErrors?.quantityExpected)}
                      />
                      {lineErrors?.quantityExpected && (
                        <p className="mt-1 text-xs text-red-600">{lineErrors.quantityExpected.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600">Qty Received</label>
                      <input
                        type="number"
                        {...register(`lines.${index}.quantityReceived`)}
                        placeholder="0"
                        className={inputClass(!!lineErrors?.quantityReceived)}
                      />
                      {lineErrors?.quantityReceived && (
                        <p className="mt-1 text-xs text-red-600">{lineErrors.quantityReceived.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600">Batch # (optional)</label>
                      <input
                        {...register(`lines.${index}.batchNumber`)}
                        placeholder="Batch number"
                        className={inputClass(false)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600">Expiry (optional)</label>
                      <input
                        type="date"
                        {...register(`lines.${index}.expiryDate`)}
                        className={inputClass(false)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/warehouse/receipts')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Receipt'}
          </button>
        </div>
      </form>
    </div>
  )
}
