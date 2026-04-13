import { useState, useEffect } from 'react'
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
import type { StorageLocation, Warehouse } from '@/types/warehouse'

const locationSchema = z.object({
  zone: z.string().min(1, 'Zone is required'),
  aisle: z.string().min(1, 'Aisle is required'),
  shelf: z.string().min(1, 'Shelf is required'),
  bin: z.string().min(1, 'Bin is required'),
  locationType: z.enum(['SHELF', 'FLOOR', 'COLD', 'HAZMAT'], {
    message: 'Location type is required',
  }),
  maxCapacity: z.coerce
    .number({ message: 'Capacity must be a number' })
    .int('Must be a whole number')
    .positive('Capacity must be positive'),
})

type LocationFormValues = z.infer<typeof locationSchema>

type LocationRow = StorageLocation & Record<string, unknown>

function utilizationColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-green-500'
}

function utilizationTextColor(pct: number): string {
  if (pct >= 90) return 'text-red-700'
  if (pct >= 70) return 'text-amber-700'
  return 'text-green-700'
}

const columns = [
  {
    key: 'code',
    header: 'Code',
    render: (row: LocationRow) => (
      <span className="font-mono text-sm font-medium text-gray-900">
        {row.zone}-{row.aisle}-{row.shelf}-{row.bin}
      </span>
    ),
  },
  {
    key: 'locationType',
    header: 'Type',
    render: (row: LocationRow) => <StatusBadge status={row.locationType} />,
  },
  {
    key: 'maxCapacity',
    header: 'Max Capacity',
    render: (row: LocationRow) => row.maxCapacity.toLocaleString(),
  },
  {
    key: 'currentOccupancy',
    header: 'Current Occupancy',
    render: (row: LocationRow) => row.currentOccupancy.toLocaleString(),
  },
  {
    key: 'utilization',
    header: 'Utilization',
    render: (row: LocationRow) => {
      const pct = row.maxCapacity > 0
        ? Math.round((row.currentOccupancy / row.maxCapacity) * 100)
        : 0
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn('h-full rounded-full transition-all', utilizationColor(pct))}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className={cn('text-xs font-medium', utilizationTextColor(pct))}>
            {pct}%
          </span>
        </div>
      )
    },
  },
  {
    key: 'active',
    header: 'Status',
    render: (row: LocationRow) => (
      <StatusBadge status={row.active ? 'ACTIVE' : 'INACTIVE'} />
    ),
  },
]

export function LocationListPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [warehouseId, setWarehouseId] = useState<string>('')
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)
  const getWarehouseId = useAuthStore((s) => s.getWarehouseId)
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getWarehouses(),
  })

  useEffect(() => {
    if (isWarehouseStaff()) {
      const assignedId = getWarehouseId()
      if (assignedId) setWarehouseId(assignedId)
    }
  }, [isWarehouseStaff, getWarehouseId])

  const {
    data: locations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['locations', warehouseId],
    queryFn: () => warehouseApi.getLocations(warehouseId),
    enabled: !!warehouseId,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema) as never,
    defaultValues: { zone: '', aisle: '', shelf: '', bin: '' },
  })

  const createMutation = useMutation({
    mutationFn: (data: LocationFormValues) =>
      warehouseApi.createLocation(warehouseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', warehouseId] })
      addToast('success', 'Storage location created')
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

  const onSubmit = (data: LocationFormValues) => {
    createMutation.mutate(data)
  }

  return (
    <div>
      <PageHeader
        title="Storage Locations"
        description="Manage storage locations within warehouses"
        actions={
          isAdmin() && warehouseId ? (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Location
            </button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Warehouse</label>
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          disabled={isWarehouseStaff()}
          className={cn(
            'mt-1 block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            isWarehouseStaff() && 'bg-gray-100',
          )}
        >
          <option value="">Select warehouse…</option>
          {(warehouses ?? []).map((w: Warehouse) => (
            <option key={w.warehouseId} value={w.warehouseId}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {!warehouseId && (
        <div className="rounded-lg border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">
          Select a warehouse to view storage locations
        </div>
      )}

      {warehouseId && isLoading && (
        <LoadingSpinner className="py-32" label="Loading locations…" />
      )}

      {warehouseId && error && (
        <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      )}

      {warehouseId && !isLoading && !error && (
        <DataTable
          columns={columns}
          data={(locations ?? []) as LocationRow[]}
          keyExtractor={(row) => row.locationId}
          emptyMessage="No storage locations found"
        />
      )}

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
            <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Add Storage Location</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Zone</label>
                    <input
                      {...register('zone')}
                      placeholder="e.g. A"
                      className={cn(
                        'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                        formErrors.zone ? 'border-red-400' : 'border-gray-300',
                      )}
                    />
                    {formErrors.zone && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.zone.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Aisle</label>
                    <input
                      {...register('aisle')}
                      placeholder="e.g. 01"
                      className={cn(
                        'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                        formErrors.aisle ? 'border-red-400' : 'border-gray-300',
                      )}
                    />
                    {formErrors.aisle && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.aisle.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Shelf</label>
                    <input
                      {...register('shelf')}
                      placeholder="e.g. 03"
                      className={cn(
                        'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                        formErrors.shelf ? 'border-red-400' : 'border-gray-300',
                      )}
                    />
                    {formErrors.shelf && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.shelf.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bin</label>
                    <input
                      {...register('bin')}
                      placeholder="e.g. 07"
                      className={cn(
                        'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                        formErrors.bin ? 'border-red-400' : 'border-gray-300',
                      )}
                    />
                    {formErrors.bin && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.bin.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Type</label>
                  <select
                    {...register('locationType')}
                    className={cn(
                      'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                      formErrors.locationType ? 'border-red-400' : 'border-gray-300',
                    )}
                  >
                    <option value="">Select type…</option>
                    <option value="SHELF">Shelf</option>
                    <option value="FLOOR">Floor</option>
                    <option value="COLD">Cold</option>
                    <option value="HAZMAT">Hazmat</option>
                  </select>
                  {formErrors.locationType && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.locationType.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Capacity</label>
                  <input
                    type="number"
                    {...register('maxCapacity')}
                    className={cn(
                      'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                      formErrors.maxCapacity ? 'border-red-400' : 'border-gray-300',
                    )}
                  />
                  {formErrors.maxCapacity && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.maxCapacity.message}</p>
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
                    {createMutation.isPending ? 'Creating…' : 'Create Location'}
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
