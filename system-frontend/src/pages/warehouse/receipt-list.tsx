import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { warehouseApi } from '@/api/warehouse'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { StatusBadge } from '@/components/shared/status-badge'
import { ErrorState } from '@/components/shared/error-state'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Pagination } from '@/components/shared/pagination'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { getApiErrorMessage } from '@/hooks/use-api-error'
import { cn } from '@/lib/utils'
import type { InboundReceipt, Warehouse } from '@/types/warehouse'

const STATUS_TABS = ['All', 'PENDING', 'CONFIRMED', 'REJECTED'] as const

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

export function ReceiptListPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const canCreate = isAdmin() || isWarehouseStaff()

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getWarehouses(),
  })

  const warehouseLookup = new Map(
    (warehouses ?? []).map((w: Warehouse) => [w.warehouseId, w.name]),
  )

  const queryParams = {
    page,
    limit: 10,
    ...(statusFilter !== 'All' && { status: statusFilter }),
    ...(warehouseFilter && { warehouseId: warehouseFilter }),
  }

  const {
    data: receiptData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['receipts', queryParams],
    queryFn: () => warehouseApi.getReceipts(queryParams),
  })

  const confirmMutation = useMutation({
    mutationFn: (receiptId: string) => warehouseApi.confirmReceipt(receiptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      addToast('success', 'Receipt confirmed')
      setConfirmTarget(null)
    },
    onError: (err: unknown) => {
      addToast('error', getApiErrorMessage(err))
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ receiptId, reason }: { receiptId: string; reason: string }) =>
      warehouseApi.rejectReceipt(receiptId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      addToast('success', 'Receipt rejected')
      setRejectTarget(null)
      setRejectReason('')
    },
    onError: (err: unknown) => {
      addToast('error', getApiErrorMessage(err))
    },
  })

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const receipts = receiptData?.data ?? []
  const pagination = receiptData?.pagination

  return (
    <div>
      <PageHeader
        title="Inbound Receipts"
        description="Manage goods received at warehouses"
        actions={
          canCreate ? (
            <Link
              to="/warehouse/receipts/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              New Receipt
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setStatusFilter(tab); setPage(1) }}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab === 'All' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
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
      </div>

      {isLoading && <LoadingSpinner className="py-32" label="Loading receipts…" />}

      {error && <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />}

      {!isLoading && !error && receipts.length === 0 && (
        <EmptyState title="No receipts found" description="Try adjusting your filters" />
      )}

      {!isLoading && !error && receipts.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="w-8 px-4 py-3" />
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Receipt ID</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase">PO ID</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Received By</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipts.map((receipt: InboundReceipt) => {
                  const isExpanded = expandedRows.has(receipt.receiptId)
                  return (
                    <ReceiptRow
                      key={receipt.receiptId}
                      receipt={receipt}
                      isExpanded={isExpanded}
                      warehouseName={warehouseLookup.get(receipt.warehouseId) ?? truncateId(receipt.warehouseId)}
                      onToggle={() => toggleRow(receipt.receiptId)}
                      onConfirm={() => setConfirmTarget(receipt.receiptId)}
                      onReject={() => setRejectTarget(receipt.receiptId)}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>

          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && confirmMutation.mutate(confirmTarget)}
        title="Confirm Receipt"
        description="Are you sure you want to confirm this inbound receipt? This will update inventory accordingly."
        confirmLabel="Confirm Receipt"
        loading={confirmMutation.isPending}
      />

      {rejectTarget &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => { setRejectTarget(null); setRejectReason('') }} />
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900">Reject Receipt</h2>
              <p className="mt-2 text-sm text-gray-600">
                Provide a reason for rejecting this receipt.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Rejection reason…"
                className="mt-3 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason('') }}
                  disabled={rejectMutation.isPending}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    rejectTarget &&
                    rejectMutation.mutate({ receiptId: rejectTarget, reason: rejectReason })
                  }
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

function ReceiptRow({
  receipt,
  isExpanded,
  warehouseName,
  onToggle,
  onConfirm,
  onReject,
}: {
  receipt: InboundReceipt
  isExpanded: boolean
  warehouseName: string
  onToggle: () => void
  onConfirm: () => void
  onReject: () => void
}) {
  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-gray-700">{truncateId(receipt.receiptId)}</td>
        <td className="px-4 py-3 font-mono text-xs text-gray-700">{truncateId(receipt.purchaseOrderId)}</td>
        <td className="px-4 py-3 text-gray-700">{warehouseName}</td>
        <td className="px-4 py-3"><StatusBadge status={receipt.status} /></td>
        <td className="px-4 py-3 text-gray-700">{truncateId(receipt.receivedBy)}</td>
        <td className="px-4 py-3 text-gray-500">{new Date(receipt.createdAt).toLocaleDateString()}</td>
        <td className="px-4 py-3">
          {receipt.status === 'PENDING' && (
            <div className="flex gap-2">
              <button
                onClick={onConfirm}
                className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
              >
                Confirm
              </button>
              <button
                onClick={onReject}
                className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Reject
              </button>
            </div>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={8} className="bg-gray-50 px-8 py-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Receipt Lines
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="pb-2 pr-4">Product ID</th>
                  <th className="pb-2 pr-4">Qty Expected</th>
                  <th className="pb-2 pr-4">Qty Received</th>
                  <th className="pb-2 pr-4">Batch #</th>
                  <th className="pb-2">Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {receipt.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-700">
                      {truncateId(line.productId)}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{line.quantityExpected}</td>
                    <td className={cn(
                      'py-2 pr-4',
                      line.quantityReceived < line.quantityExpected
                        ? 'font-medium text-amber-600'
                        : 'text-gray-700',
                    )}>
                      {line.quantityReceived}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{line.batchNumber ?? '—'}</td>
                    <td className="py-2 text-gray-500">
                      {line.expiryDate
                        ? new Date(line.expiryDate).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}
