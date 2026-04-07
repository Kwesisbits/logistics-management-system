import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { createPortal } from 'react-dom'
import { inventoryApi } from '@/api/inventory'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { ErrorState } from '@/components/shared/error-state'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import type { Batch } from '@/types/inventory'

const BATCH_STATUSES = ['ACTIVE', 'RECALLED', 'CONSUMED'] as const

export function BatchListPage() {
  const [page, setPage] = useState(1)
  const [productFilter, setProductFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newBatch, setNewBatch] = useState({
    productId: '',
    batchNumber: '',
    quantity: 0,
    manufactureDate: '',
    expiryDate: '',
  })

  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const canManage = isAdmin() || isWarehouseStaff()

  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 100 }],
    queryFn: () => inventoryApi.getProducts({ limit: 100 }),
  })

  const products = productsData?.data ?? []
  const productMap = new Map(products.map((p) => [p.productId, p.name]))

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['batches', { page, productId: productFilter, status: statusFilter }],
    queryFn: () =>
      inventoryApi.getBatches({
        page,
        limit: 10,
        productId: productFilter || undefined,
        status: statusFilter || undefined,
      }),
  })

  const createBatchMutation = useMutation({
    mutationFn: inventoryApi.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      addToast('success', 'Batch created successfully')
      closeAddModal()
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  const statusMutation = useMutation({
    mutationFn: ({ batchId, status }: { batchId: string; status: string }) =>
      inventoryApi.updateBatchStatus(batchId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      addToast('success', 'Batch status updated')
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  function closeAddModal() {
    setShowAddModal(false)
    setNewBatch({
      productId: '',
      batchNumber: '',
      quantity: 0,
      manufactureDate: '',
      expiryDate: '',
    })
  }

  function handleCreateBatch() {
    createBatchMutation.mutate({
      productId: newBatch.productId,
      batchNumber: newBatch.batchNumber,
      quantity: newBatch.quantity,
      manufactureDate: newBatch.manufactureDate || undefined,
      expiryDate: newBatch.expiryDate || undefined,
    })
  }

  function formatDate(date: string | null) {
    if (!date) return '—'
    return new Date(date).toLocaleDateString()
  }

  const columns = [
    {
      key: 'batchNumber',
      header: 'Batch Number',
      render: (row: Batch) => (
        <span className="font-medium text-gray-900">{row.batchNumber}</span>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (row: Batch) => productMap.get(row.productId) ?? row.productId,
    },
    { key: 'quantity', header: 'Quantity', render: (row: Batch) => row.quantity },
    {
      key: 'status',
      header: 'Status',
      render: (row: Batch) => <StatusBadge status={row.status} />,
    },
    {
      key: 'manufactureDate',
      header: 'Manufacture Date',
      render: (row: Batch) => formatDate(row.manufactureDate),
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      render: (row: Batch) => formatDate(row.expiryDate),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (row: Batch) => (
              <select
                value={row.status}
                onChange={(e) =>
                  statusMutation.mutate({ batchId: row.batchId, status: e.target.value })
                }
                className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
              >
                {BATCH_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ),
          },
        ]
      : []),
  ]

  if (isError) {
    return <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
  }

  const selectClass =
    'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const modalInputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div>
      <PageHeader
        title="Batch Tracking"
        actions={
          canManage ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Batch
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          value={productFilter}
          onChange={(e) => {
            setProductFilter(e.target.value)
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.productId} value={p.productId}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className={selectClass}
        >
          <option value="">All Statuses</option>
          {BATCH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={(data?.data ?? []) as (Batch & Record<string, unknown>)[]}
        loading={isLoading}
        keyExtractor={(row) => row.batchId}
        emptyMessage="No batches found"
      />

      {data?.pagination && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={closeAddModal} />
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900">Add Batch</h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Product</label>
                  <select
                    value={newBatch.productId}
                    onChange={(e) =>
                      setNewBatch((prev) => ({ ...prev, productId: e.target.value }))
                    }
                    className={modalInputClass}
                  >
                    <option value="">Select a product</option>
                    {products.map((p) => (
                      <option key={p.productId} value={p.productId}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={newBatch.batchNumber}
                    onChange={(e) =>
                      setNewBatch((prev) => ({ ...prev, batchNumber: e.target.value }))
                    }
                    className={modalInputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    value={newBatch.quantity}
                    onChange={(e) =>
                      setNewBatch((prev) => ({ ...prev, quantity: Number(e.target.value) }))
                    }
                    className={modalInputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Manufacture Date
                    </label>
                    <input
                      type="date"
                      value={newBatch.manufactureDate}
                      onChange={(e) =>
                        setNewBatch((prev) => ({ ...prev, manufactureDate: e.target.value }))
                      }
                      className={modalInputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={newBatch.expiryDate}
                      onChange={(e) =>
                        setNewBatch((prev) => ({ ...prev, expiryDate: e.target.value }))
                      }
                      className={modalInputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeAddModal}
                  disabled={createBatchMutation.isPending}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBatch}
                  disabled={
                    createBatchMutation.isPending ||
                    !newBatch.productId ||
                    !newBatch.batchNumber ||
                    newBatch.quantity <= 0
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createBatchMutation.isPending ? 'Creating…' : 'Create Batch'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
