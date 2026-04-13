import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { Plus, X } from 'lucide-react'
import { warehouseApi } from '@/api/warehouse'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { StatusBadge } from '@/components/shared/status-badge'
import { ErrorState } from '@/components/shared/error-state'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { cn } from '@/lib/utils'
import type { Warehouse } from '@/types/warehouse'

const warehouseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  street: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  type: z.enum(['MAIN', 'SATELLITE', 'COLD_STORAGE'], {
    message: 'Type is required',
  }),
  capacity: z.coerce
    .number({ message: 'Capacity must be a number' })
    .int('Must be a whole number')
    .positive('Capacity must be positive'),
})

type WarehouseFormValues = z.infer<typeof warehouseSchema>

type WarehouseRow = Warehouse & Record<string, unknown>

const columns = [
  { key: 'name', header: 'Name', render: (row: WarehouseRow) => (
    <span className="font-medium text-gray-900">{row.name}</span>
  )},
  { key: 'city', header: 'City', render: (row: WarehouseRow) => row.city ?? '—' },
  { key: 'country', header: 'Country', render: (row: WarehouseRow) => row.country ?? '—' },
  { key: 'type', header: 'Type', render: (row: WarehouseRow) => <StatusBadge status={row.type} /> },
  { key: 'capacity', header: 'Capacity', render: (row: WarehouseRow) => row.capacity.toLocaleString() },
  {
    key: 'active',
    header: 'Status',
    render: (row: WarehouseRow) => (
      <StatusBadge status={row.active ? 'ACTIVE' : 'INACTIVE'} />
    ),
  },
]

export function WarehouseListPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const {
    data: warehouses,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getWarehouses(),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema) as never,
    defaultValues: { name: '', street: '', city: '', country: '' },
  })

  const createMutation = useMutation({
    mutationFn: warehouseApi.createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      addToast('success', 'Warehouse created')
      closeModal()
    },
    onError: (err: unknown) => {
      addToast('error', getApiErrorMessage(err))
    },
  })

  const closeModal = () => {
    setModalOpen(false)
    reset()
  }

  const onSubmit = (data: WarehouseFormValues) => {
    createMutation.mutate(data)
  }

  if (isLoading) {
    return <LoadingSpinner className="py-32" label="Loading warehouses…" />
  }

  if (error) {
    return <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
  }

  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Manage warehouse facilities"
        actions={
          isAdmin() ? (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Warehouse
            </button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={(warehouses ?? []) as WarehouseRow[]}
        keyExtractor={(row) => row.warehouseId}
        emptyMessage="No warehouses found"
      />

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
            <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Add Warehouse</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    {...register('name')}
                    className={cn(
                      'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                      formErrors.name ? 'border-red-400' : 'border-gray-300',
                    )}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Street</label>
                  <input
                    {...register('street')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      {...register('city')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Country</label>
                    <input
                      {...register('country')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    {...register('type')}
                    className={cn(
                      'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                      formErrors.type ? 'border-red-400' : 'border-gray-300',
                    )}
                  >
                    <option value="">Select type…</option>
                    <option value="MAIN">Main</option>
                    <option value="SATELLITE">Satellite</option>
                    <option value="COLD_STORAGE">Cold Storage</option>
                  </select>
                  {formErrors.type && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacity</label>
                  <input
                    type="number"
                    {...register('capacity')}
                    className={cn(
                      'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                      formErrors.capacity ? 'border-red-400' : 'border-gray-300',
                    )}
                  />
                  {formErrors.capacity && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.capacity.message}</p>
                  )}
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
                    {createMutation.isPending ? 'Creating…' : 'Create Warehouse'}
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
