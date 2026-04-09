import { useState } from 'react'
import { Search, Plus, Edit, Trash2, ArrowUpDown, Package, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import { inventoryApi } from '../../services/axiosInstance'

const categories = ['All', 'Packaging', 'Hardware', 'Storage', 'Safety']

export default function Products() {
  const user    = useAuthStore((s) => s.user)
  const isAdmin = user?.roleName === 'ADMIN'

  // ── Local state ──
  const [search, setSearch]         = useState('')
  const [category, setCategory]     = useState('All')
  const [page, setPage]             = useState(1)
  const [sortField, setSortField]   = useState(null)
  const [sortDir, setSortDir]       = useState('asc')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showAddForm, setShowAddForm]   = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', { page, category, search }],
    queryFn: async () => {
      const response = await inventoryApi.get('/products', {
        params: {
          page,
          limit: 20,
          category: category !== 'All' ? category : undefined,
          search: search || undefined,
        },
      })
      return response.data
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
  const products = data?.data ?? []
  const pagination = data?.pagination ?? {}

  const deleteProduct = useMutation({
    mutationFn: (productId) => inventoryApi.delete(`/products/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase()
      return (
        (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&
        (category === 'All' || p.category === category)
      )
    })
    .sort((a, b) => {
      if (!sortField) return 0
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'unitCost') return (a.unitCost - b.unitCost) * dir
      return String(a[sortField]).localeCompare(String(b[sortField])) * dir
    })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark-base dark:text-white">Products</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLoading ? 'Loading...' : `${products.length} products in catalog`}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-medium-green hover:bg-deep-green active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
          >
            <Plus size={15} /> Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="app-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-dark-base dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-medium-green transition-all"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-dark-base dark:text-white focus:outline-none focus:ring-2 focus:ring-medium-green"
        >
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="app-card p-12 flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-medium-green" />
          <p className="text-sm text-gray-400">Loading products...</p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="app-card border-red-200 dark:border-red-900/40 p-8 text-center">
          <p className="text-sm text-red-500 mb-3">Failed to load products</p>
          <button onClick={() => refetch()} className="px-4 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 text-xs uppercase border-b border-gray-100 dark:border-gray-700">
                  {[
                    { label: 'Product',    field: 'name'             },
                    { label: 'Category',   field: 'category'         },
                    { label: 'Unit',       field: 'unitOfMeasure'    },
                    { label: 'Unit Cost',  field: 'unitCost'         },
                    { label: 'Reorder At', field: 'reorderThreshold' },
                  ].map(({ label, field }) => (
                    <th
                      key={label}
                      onClick={() => handleSort(field)}
                      className="px-6 py-3 text-left font-medium cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 select-none"
                    >
                      <div className="flex items-center gap-1">
                        {label} <ArrowUpDown size={10} className="opacity-40" />
                      </div>
                    </th>
                  ))}
                  {isAdmin && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Package size={28} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">No products found</p>
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <tr key={p.productId} className="hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-dark-base dark:text-white group-hover:text-medium-green transition-colors">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.sku}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs font-mono">{p.unitOfMeasure}</td>
                    <td className="px-6 py-4 font-semibold text-dark-base dark:text-white">GHS {p.unitCost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{p.reorderThreshold} units</td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-medium-green transition-all">
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {filtered.length} of {pagination.total ?? products.length} products
            </p>
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
                disabled={page >= (pagination.totalPages ?? 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="app-card rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-dark-base dark:text-white mb-1">Delete product?</h3>
            <p className="text-sm text-gray-400 mb-5">
              <span className="font-medium text-gray-600 dark:text-gray-300">{deleteTarget.name}</span> will be permanently removed.
              {/* API: DELETE /inventory/products/:productId */}
              {/* Error to handle: NOT_FOUND (404) */}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteProduct.mutate(deleteTarget.productId)
                  setDeleteTarget(null)
                }}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}