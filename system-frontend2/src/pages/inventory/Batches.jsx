import { useState } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import { inventoryApi } from '../../services/axiosInstance'

// ── REAL API (uncomment when backend is ready) ──
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import api from '../../lib/axios'
//
// function useBatches({ productId, status, page }) {
//   return useQuery({
//     queryKey: ['batches', { productId, status, page }],
//     queryFn: () =>
//       api.get('/inventory/batches', {
//         params: {
//           productId: productId || undefined,
//           status: status !== 'All' ? status : undefined,
//           page,
//           limit: 20,
//         },
//       }).then(r => r.data),
//     staleTime: 30_000,
//     placeholderData: (prev) => prev,
//   })
// }
//
// function useUpdateBatchStatus() {
//   const qc = useQueryClient()
//   return useMutation({
//     mutationFn: ({ batchId, status }) =>
//       api.patch(`/inventory/batches/${batchId}/status`, { status }),
//     onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
//   })
// }

// BatchStatusEnum — only these transitions are valid per the state machine
const STATUS_TRANSITIONS = {
  ACTIVE:         ['RECALLED', 'CONSUMED'],
  PARTIALLY_USED: ['RECALLED', 'CONSUMED'],
  CONSUMED:       [],
  RECALLED:       [],
  EXPIRED:        [],
}

const statusConfig = {
  ACTIVE:         { label: 'Active',        className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'   },
  PARTIALLY_USED: { label: 'Partial',       className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'       },
  CONSUMED:       { label: 'Consumed',      className: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'          },
  RECALLED:       { label: 'Recalled',      className: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'           },
  EXPIRED:        { label: 'Expired',       className: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300'},
}

const ALL_STATUSES = ['All', 'ACTIVE', 'PARTIALLY_USED', 'CONSUMED', 'RECALLED', 'EXPIRED']

export default function Batches() {
  const user    = useAuthStore((s) => s.user)
  const canEdit = ['ADMIN', 'WAREHOUSE_STAFF'].includes(user?.roleName)
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [page, setPage]     = useState(1)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['batches', { status, page }],
    queryFn: async () => {
      const response = await inventoryApi.get('/batches', {
        params: {
          status: status !== 'All' ? status : undefined,
          page,
          limit: 20,
        },
      })
      return response.data
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
  const batches = data?.data ?? []

  const updateBatchStatus = useMutation({
    mutationFn: ({ batchId, status: nextStatus }) =>
      inventoryApi.patch(`/batches/${batchId}/status`, { status: nextStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['batches'] }),
  })

  const filtered = batches.filter((b) => {
    const q = search.toLowerCase()
    return (
      (b.name.toLowerCase().includes(q) ||
       b.batchNumber.toLowerCase().includes(q) ||
       b.sku.toLowerCase().includes(q)) &&
      (status === 'All' || b.status === status)
    )
  })

  function handleStatusChange(batchId, newStatus) {
    updateBatchStatus.mutate({ batchId, status: newStatus })
  }

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark-base dark:text-white">Batches</h2>
          <p className="text-sm text-gray-400 mt-0.5">Track batch numbers, quantities and expiry dates</p>
        </div>
        {canEdit && (
          <button className="flex items-center gap-2 px-4 py-2 bg-medium-green hover:bg-deep-green active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm">
            <Plus size={15} /> New Batch
            {/* TODO: open CreateBatchModal — POST /inventory/batches */}
            {/* Body: { productId, batchNumber, quantity, manufactureDate?, expiryDate? } */}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="app-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search batch number, product or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-dark-base dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-medium-green transition-all"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-medium-green"
        >
          {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-medium-green" />
          <p className="text-sm text-gray-400">Loading batches...</p>
        </div>
      )}

      {isError && (
        <div className="app-card border-red-200 dark:border-red-900/40 p-8 text-center">
          <p className="text-sm text-red-500 mb-3">Failed to load batches</p>
          <button onClick={() => refetch()} className="px-4 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-xs uppercase border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-3 text-left font-medium">Product</th>
                  <th className="px-6 py-3 text-left font-medium">Batch Number</th>
                  <th className="px-6 py-3 text-left font-medium">Quantity</th>
                  <th className="px-6 py-3 text-left font-medium">Mfg Date</th>
                  <th className="px-6 py-3 text-left font-medium">Expiry</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  {canEdit && <th className="px-6 py-3 text-left font-medium">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                      No batches found
                    </td>
                  </tr>
                ) : filtered.map((b) => {
                  const cfg        = statusConfig[b.status]
                  const transitions = STATUS_TRANSITIONS[b.status] ?? []
                  const soonExpiry  = b.expiryDate &&
                    new Date(b.expiryDate) < new Date(Date.now() + 30 * 86400000) &&
                    b.status === 'ACTIVE'

                  return (
                    <tr key={b.batchId} className="hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-dark-base dark:text-white">{b.name ?? b.productName ?? b.productId}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{b.sku ?? '—'}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">{b.batchNumber}</td>
                      <td className="px-6 py-4 font-medium text-dark-base dark:text-white">{b.quantity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-400 text-xs">{b.manufactureDate ?? '—'}</td>
                      <td className="px-6 py-4 text-xs">
                        {b.expiryDate
                          ? <span className={soonExpiry ? 'text-amber-500 font-medium' : 'text-gray-400'}>
                              {soonExpiry && '⚠ '}{b.expiryDate}
                            </span>
                          : <span className="text-gray-300 dark:text-gray-600">No expiry</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg?.className}`}>
                          {cfg?.label}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4">
                          {transitions.length > 0 ? (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) handleStatusChange(b.batchId, e.target.value)
                              }}
                              className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-medium-green transition-all"
                            >
                              <option value="" disabled>Update status</option>
                              {transitions.map((t) => (
                                <option key={t} value={t}>{statusConfig[t]?.label ?? t}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">Showing {filtered.length} of {data?.pagination?.total ?? batches.length} batches</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-all"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs bg-medium-green text-white rounded-lg font-semibold">{page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}