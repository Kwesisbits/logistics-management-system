import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { Plus, X, Search } from 'lucide-react'
import { warehouseApi } from '@/api/warehouse'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { StatusBadge } from '@/components/shared/status-badge'
import { ErrorState } from '@/components/shared/error-state'
import { Pagination } from '@/components/shared/pagination'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { cn } from '@/lib/utils'
import type { StockMovement, Warehouse } from '@/types/warehouse'

const MOVEMENT_TYPES = ['RECEIPT', 'DISPATCH', 'TRANSFER', 'ADJUSTMENT'] as const

const movementSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  fromLocationId: z.string().min(1, 'From location is required'),
  toLocationId: z.string().min(1, 'To location is required'),
  quantity: z.coerce
    .number({ message: 'Quantity must be a number' })
    .int('Must be a whole number')
    .positive('Quantity must be positive'),
  movementType: z.enum(['RECEIPT', 'DISPATCH', 'TRANSFER', 'ADJUSTMENT'], {
    message: 'Movement type is required',
  }),
  performedBy: z.string().min(1, 'Performed by is required'),
  notes: z.string().optional(),
})

type MovementFormValues = z.infer<typeof movementSchema>

type MovementRow = StockMovement & Record<string, unknown>

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

const columns = [
  {
    key: 'movementId',
    header: 'Movement ID',
    render: (row: MovementRow) => (
      <span className="font-mono text-xs">{truncateId(row.movementId)}</span>
    ),
  },
  {
    key: 'productId',
    header: 'Product',
    render: (row: MovementRow) => (
      <span className="font-mono text-xs">{truncateId(row.productId)}</span>
    ),
  },
  {
    key: 'movementType',
    header: 'Type',
    render: (row: MovementRow) => <StatusBadge status={row.movementType} />,
  },
  {
    key: 'quantity',
    header: 'Quantity',
    render: (row: MovementRow) => row.quantity.toLocaleString(),
  },
  {
    key: 'fromLocationId',
    header: 'From Location',
    render: (row: MovementRow) =>
      row.fromLocationId ? truncateId(row.fromLocationId) : '—',
  },
  {
    key: 'toLocationId',
    header: 'To Location',
    render: (row: MovementRow) =>
      row.toLocationId ? truncateId(row.toLocationId) : '—',
  },
  {
    key: 'performedBy',
    header: 'Performed By',
    render: (row: MovementRow) => truncateId(row.performedBy),
  },
  {
    key: 'createdAt',
    header: 'Date',
    render: (row: MovementRow) => new Date(row.createdAt).toLocaleDateString(),
  },
]

export function MovementListPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [productSearch, setProductSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const canCreate = isAdmin() || isWarehouseStaff()

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseApi.getWarehouses,
  })

  const queryParams = {
    page,
    limit: 10,
    ...(productSearch && { productId: productSearch }),
    ...(warehouseFilter && { warehouseId: warehouseFilter }),
    ...(typeFilter && { movementType: typeFilter }),
  }

  const {
    data: movementData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['movements', queryParams],
    queryFn: () => warehouseApi.getMovements(queryParams),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema) as never,
    defaultValues: {
      productId: '',
      fromLocationId: '',
      toLocationId: '',
      performedBy: user?.userId ?? '',
      notes: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: warehouseApi.createMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] })
      addToast('success', 'Movement recorded')
      closeModal()
    },
    onError: (err: unknown) => {
      addToast('error', getApiErrorMessage(err))
    },
  })

  const closeModal = () => {
    setModalOpen(false)
    reset({
      productId: '',
      fromLocationId: '',
      toLocationId: '',
      performedBy: user?.userId ?? '',
      notes: '',
    })
  }

  const onSubmit = (data: MovementFormValues) => {
    createMutation.mutate(data)
  }

  const movements = movementData?.data ?? []
  const pagination = movementData?.pagination

  const inputClass = (hasError: boolean) =>
    cn(
      'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      hasError ? 'border-red-400' : 'border-gray-300',
    )

  return (
    <div>
      <PageHeader
        title="Stock Movements"
        description="Track all inventory movements"
        actions={
          canCreate ? (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              New Movement
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={productSearch}
            onChange={(e) => { setProductSearch(e.target.value); setPage(1) }}
            placeholder="Search product ID…"
            className="rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={warehouseFilter}
          onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All Warehouses</option>
          {(warehouses ?? []).map((w: Warehouse) => (
            <option key={w.warehouseId} value={w.warehouseId}>
              {w.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All Types</option>
          {MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingSpinner className="py-32" label="Loading movements…" />}

      {error && <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />}

      {!isLoading && !error && (
        <>
          <DataTable
            columns={columns}
            data={movements as MovementRow[]}
            keyExtractor={(row) => row.movementId}
            emptyMessage="No stock movements found"
          />

          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
            <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">New Movement</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product ID</label>
                  <input
                    {...register('productId')}
                    className={inputClass(!!formErrors.productId)}
                  />
                  {formErrors.productId && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.productId.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">From Location ID</label>
                    <input
                      {...register('fromLocationId')}
                      className={inputClass(!!formErrors.fromLocationId)}
                    />
                    {formErrors.fromLocationId && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.fromLocationId.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">To Location ID</label>
                    <input
                      {...register('toLocationId')}
                      className={inputClass(!!formErrors.toLocationId)}
                    />
                    {formErrors.toLocationId && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.toLocationId.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      {...register('quantity')}
                      className={inputClass(!!formErrors.quantity)}
                    />
                    {formErrors.quantity && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.quantity.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Movement Type</label>
                    <select
                      {...register('movementType')}
                      className={inputClass(!!formErrors.movementType)}
                    >
                      <option value="">Select type…</option>
                      {MOVEMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0) + t.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                    {formErrors.movementType && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.movementType.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Performed By</label>
                  <input
                    {...register('performedBy')}
                    readOnly
                    className={cn(inputClass(!!formErrors.performedBy), 'bg-gray-50')}
                  />
                  {formErrors.performedBy && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.performedBy.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Additional notes…"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Recording…' : 'Record Movement'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
