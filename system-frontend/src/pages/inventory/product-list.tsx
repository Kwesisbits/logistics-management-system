import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { inventoryApi } from '@/api/inventory'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { Pagination } from '@/components/shared/pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ErrorState } from '@/components/shared/error-state'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import type { Product } from '@/types/inventory'

export function ProductListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const isAdmin = useAuthStore((s) => s.isAdmin)
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['products', { page, search: debouncedSearch, category }],
    queryFn: () =>
      inventoryApi.getProducts({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        category: category || undefined,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => inventoryApi.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      addToast('success', 'Product deleted successfully')
      setDeleteTarget(null)
    },
    onError: (err) => {
      addToast('error', getApiErrorMessage(err))
      setDeleteTarget(null)
    },
  })

  const columns = [
    { key: 'name', header: 'Name', render: (row: Product) => row.name },
    { key: 'sku', header: 'SKU', render: (row: Product) => row.sku },
    { key: 'category', header: 'Category', render: (row: Product) => row.category },
    {
      key: 'unitCost',
      header: 'Unit Cost',
      render: (row: Product) => `$${row.unitCost.toFixed(2)}`,
    },
    {
      key: 'reorderThreshold',
      header: 'Reorder Threshold',
      render: (row: Product) => row.reorderThreshold,
    },
    ...(isAdmin()
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (row: Product) => (
              <div className="flex items-center gap-2">
                <Link
                  to={`/inventory/products/${row.productId}/edit`}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                >
                  <Pencil size={16} />
                </Link>
                <button
                  onClick={() => setDeleteTarget(row)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ]

  if (isError) {
    return <ErrorState message={getApiErrorMessage(error)} onRetry={refetch} />
  }

  return (
    <div>
      <PageHeader
        title="Products"
        actions={
          isAdmin() ? (
            <Link
              to="/inventory/products/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Product
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Furniture">Furniture</option>
          <option value="Clothing">Clothing</option>
          <option value="Food">Food</option>
          <option value="Raw Materials">Raw Materials</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={(data?.data ?? []) as (Product & Record<string, unknown>)[]}
        loading={isLoading}
        keyExtractor={(row) => row.productId}
        emptyMessage="No products found"
      />

      {data?.pagination && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.productId)
        }}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
