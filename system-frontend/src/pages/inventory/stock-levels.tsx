import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { createPortal } from 'react-dom'
import { inventoryApi } from '@/api/inventory'
import { warehouseApi } from '@/api/warehouse'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { ErrorState } from '@/components/shared/error-state'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import type { StockLevel } from '@/types/inventory'

const ADJUSTMENT_TYPES = ['RECEIPT', 'DISPATCH', 'ADJUSTMENT', 'DAMAGE', 'RETURN'] as const

interface AdjustModalState {
  open: boolean
  stock: StockLevel | null
}

export function StockLevelsPage() {
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [adjustModal, setAdjustModal] = useState<AdjustModalState>({
    open: false,
    stock: null,
  })
  const [adjustDelta, setAdjustDelta] = useState(0)
  const [adjustType, setAdjustType] = useState<string>('ADJUSTMENT')
  const [adjustNotes, setAdjustNotes] = useState('')

  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)
  const getWarehouseId = useAuthStore((s) => s.getWarehouseId)
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isWarehouseStaff()) {
      const wid = getWarehouseId()
      if (wid) setWarehouseId(wid)
    }
  }, [isWarehouseStaff, getWarehouseId])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getWarehouses(),
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['stock', { page, warehouseId }],
    queryFn: () =>
      inventoryApi.getStock({
        page,
        limit: 10,
        warehouseId: warehouseId || undefined,
      }),
  })

  const adjustMutation = useMutation({
    mutationFn: inventoryApi.adjustStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      addToast('success', 'Stock adjusted successfully')
      closeAdjustModal()
    },
    onError: (err) => addToast('error', getApiErrorMessage(err)),
  })

  function openAdjustModal(stock: StockLevel) {
    setAdjustModal({ open: true, stock })
    setAdjustDelta(0)
    setAdjustType('ADJUSTMENT')
    setAdjustNotes('')
  }

  function closeAdjustModal() {
    setAdjustModal({ open: false, stock: null })
  }

  function handleAdjust() {
    if (!adjustModal.stock || !user) return
    adjustMutation.mutate({
      productId: adjustModal.stock.productId,
      locationId: adjustModal.stock.locationId,
      delta: adjustDelta,
      adjustmentType: adjustType,
      notes: adjustNotes,
      performedBy: user.userId,
    })
  }

  function availableColor(stock: StockLevel) {
    if (stock.available === 0) return 'text-red-600 font-semibold'
    if (stock.available < stock.reorderThreshold) return 'text-amber-600 font-semibold'
    return 'text-green-600'
  }

  const filteredData = debouncedSearch
    ? (data?.data ?? []).filter(
        (s) =>
          s.productName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          s.sku.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : (data?.data ?? [])

  const canAdjust = isAdmin() || isWarehouseStaff()

  const columns = [
    { key: 'productName', header: 'Product', render: (row: StockLevel) => row.productName },
    { key: 'sku', header: 'SKU', render: (row: StockLevel) => row.sku },
    {
      key: 'warehouseName',
      header: 'Warehouse',
      render: (row: StockLevel) => row.warehouseName,
    },
    {
      key: 'locationCode',
      header: 'Location',
      render: (row: StockLevel) => row.locationCode,
    },
    { key: 'onHand', header: 'On Hand', render: (row: StockLevel) => row.onHand },
    { key: 'reserved', header: 'Reserved', render: (row: StockLevel) => row.reserved },
    {
      key: 'available',
      header: 'Available',
      render: (row: StockLevel) => (
        <span className={availableColor(row)}>{row.available}</span>
      ),
    },
    ...(canAdjust
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (row: StockLevel) => (
              <button
                onClick={() => openAdjustModal(row)}
                className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                Adjust
              </button>
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
      <PageHeader title="Stock Levels" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          value={warehouseId}
          onChange={(e) => {
            setWarehouseId(e.target.value)
            setPage(1)
          }}
          disabled={isWarehouseStaff()}
          className={`${selectClass} disabled:bg-gray-100`}
        >
          <option value="">All Warehouses</option>
          {warehouses?.map((w) => (
            <option key={w.warehouseId} value={w.warehouseId}>
              {w.name}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData as (StockLevel & Record<string, unknown>)[]}
        loading={isLoading}
        keyExtractor={(row) => `${row.productId}-${row.locationId}`}
        emptyMessage="No stock records found"
      />

      {data?.pagination && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {adjustModal.open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={closeAdjustModal} />
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900">Adjust Stock</h2>
              <p className="mt-1 text-sm text-gray-500">
                {adjustModal.stock?.productName} at {adjustModal.stock?.locationCode}
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Quantity Delta
                  </label>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(Number(e.target.value))}
                    className={modalInputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Adjustment Type
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className={modalInputClass}
                  >
                    {ADJUSTMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    rows={3}
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    className={modalInputClass}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeAdjustModal}
                  disabled={adjustMutation.isPending}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjust}
                  disabled={adjustMutation.isPending || adjustDelta === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {adjustMutation.isPending ? 'Adjusting…' : 'Confirm Adjustment'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
