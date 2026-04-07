import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { createPortal } from 'react-dom'
import { procurementApi } from '@/api/procurement'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ErrorState } from '@/components/shared/error-state'
import type { Supplier } from '@/types/procurement'

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  leadTimeDays: z.coerce.number().int().min(1, 'Must be at least 1 day'),
  paymentTerms: z.enum(['NET_15', 'NET_30', 'NET_60', 'PREPAID']),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

export function SupplierListPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<Supplier | null>(null)

  const {
    data: suppliers,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['suppliers'],
    queryFn: procurementApi.getSuppliers,
  })

  const createMutation = useMutation({
    mutationFn: procurementApi.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      addToast('success', 'Supplier created successfully')
      setModalOpen(false)
      reset()
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => procurementApi.deactivateSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      addToast('success', 'Supplier deactivated')
      setDeactivateTarget(null)
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as never,
    defaultValues: { paymentTerms: 'NET_30' },
  })

  const onSubmit = (data: SupplierFormValues) => createMutation.mutate(data)

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'contactEmail', header: 'Email' },
    {
      key: 'city',
      header: 'City',
      render: (row: Supplier) => row.city ?? '—',
    },
    {
      key: 'country',
      header: 'Country',
      render: (row: Supplier) => row.country ?? '—',
    },
    { key: 'leadTimeDays', header: 'Lead Time (days)' },
    {
      key: 'paymentTerms',
      header: 'Payment Terms',
      render: (row: Supplier) => row.paymentTerms.replace(/_/g, ' '),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Supplier) => (
        <StatusBadge status={row.active ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    ...(isAdmin()
      ? [
          {
            key: 'actions',
            header: '',
            render: (row: Supplier) =>
              row.active ? (
                <button
                  onClick={() => setDeactivateTarget(row)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Deactivate
                </button>
              ) : null,
          },
        ]
      : []),
  ]

  if (isLoading)
    return <LoadingSpinner className="py-32" label="Loading suppliers…" />
  if (isError)
    return (
      <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
    )

  return (
    <>
      <PageHeader
        title="Suppliers"
        actions={
          isAdmin() ? (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Supplier
            </button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={suppliers ?? []}
        keyExtractor={(row) => row.supplierId}
        emptyMessage="No suppliers found"
      />

      {modalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => {
                setModalOpen(false)
                reset()
              }}
            />
            <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Supplier
              </h2>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    {...register('name')}
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register('contactEmail')}
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.contactEmail ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {errors.contactEmail && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.contactEmail.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone (optional)
                  </label>
                  <input
                    {...register('contactPhone')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      City (optional)
                    </label>
                    <input
                      {...register('city')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Country (optional)
                    </label>
                    <input
                      {...register('country')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Lead Time (days)
                  </label>
                  <input
                    type="number"
                    {...register('leadTimeDays')}
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${errors.leadTimeDays ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {errors.leadTimeDays && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.leadTimeDays.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Terms
                  </label>
                  <select
                    {...register('paymentTerms')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="NET_15">Net 15</option>
                    <option value="NET_30">Net 30</option>
                    <option value="NET_60">Net 60</option>
                    <option value="PREPAID">Prepaid</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false)
                      reset()
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Creating…' : 'Create Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() =>
          deactivateTarget &&
          deactivateMutation.mutate(deactivateTarget.supplierId)
        }
        title="Deactivate Supplier"
        description={`Are you sure you want to deactivate "${deactivateTarget?.name}"? This supplier will no longer be available for new purchase orders.`}
        confirmLabel="Deactivate"
        loading={deactivateMutation.isPending}
      />
    </>
  )
}
