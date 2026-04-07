import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ErrorState } from '@/components/shared/error-state'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

function CancelOrderDialog({
  open,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean
  loading: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Cancel Order</h2>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to cancel this order? This action cannot be undone.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter cancellation reason…"
          rows={3}
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || !reason.trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Cancelling…' : 'Cancel Order'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isWarehouseStaff = useAuthStore((s) => s.isWarehouseStaff)
  const addToast = useUIStore((s) => s.addToast)

  const [cancelOpen, setCancelOpen] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId!),
    enabled: !!orderId,
  })

  const itemsQuery = useQuery({
    queryKey: ['order-items', orderId],
    queryFn: () => ordersApi.getOrderItems(orderId!),
    enabled: !!orderId,
  })

  const historyQuery = useQuery({
    queryKey: ['order-history', orderId],
    queryFn: () => ordersApi.getOrderHistory(orderId!),
    enabled: !!orderId,
  })

  const submitMutation = useMutation({
    mutationFn: () => ordersApi.submitOrder(orderId!),
    onSuccess: () => {
      addToast('success', 'Order submitted successfully')
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['order-history', orderId] })

      pollRef.current = setInterval(async () => {
        const updated = await ordersApi.getOrder(orderId!)
        if (updated.status !== 'PENDING') {
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = null
          queryClient.invalidateQueries({ queryKey: ['order', orderId] })
          queryClient.invalidateQueries({ queryKey: ['order-history', orderId] })
        }
      }, 2000)

      timeoutRef.current = setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }, 30000)
    },
    onError: () => {
      addToast('error', 'Failed to submit order')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      ordersApi.cancelOrder(orderId!, { reason, cancelledBy: user!.userId }),
    onSuccess: () => {
      addToast('success', 'Order cancelled')
      setCancelOpen(false)
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['order-history', orderId] })
    },
    onError: () => {
      addToast('error', 'Failed to cancel order')
    },
  })

  if (!orderId) {
    return <ErrorState message="Order ID is required." />
  }

  if (orderQuery.isLoading) {
    return <LoadingSpinner size={32} />
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <ErrorState
        message="Failed to load order details."
        onRetry={() => orderQuery.refetch()}
      />
    )
  }

  const order = orderQuery.data
  const items = itemsQuery.data ?? []
  const history = historyQuery.data ?? []
  const canAct = isAdmin() || isWarehouseStaff()

  return (
    <div>
      <PageHeader title={`Order #${orderId.slice(0, 8)}`}>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
      </PageHeader>

      {/* Info Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
          <div className="mt-2">
            <StatusBadge status={order.status} className="text-sm" />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Priority</p>
          <div className="mt-2">
            <StatusBadge status={order.priority} />
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Amount</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {formatCurrency(order.totalAmount)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Expected Delivery</p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {order.expectedDelivery
              ? format(new Date(order.expectedDelivery), 'MMM d, yyyy')
              : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Customer ID</p>
          <p className="mt-2 text-sm font-mono text-gray-900">
            {order.customerId.slice(0, 8)}…
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {canAct && (order.status === 'DRAFT' || order.status === 'PENDING') && (
        <div className="mt-6 flex gap-3">
          {order.status === 'DRAFT' && (
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Submitting…' : 'Submit Order'}
            </button>
          )}
          <button
            onClick={() => setCancelOpen(true)}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Cancel Order
          </button>
        </div>
      )}

      {/* Order Items */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Order Items</h2>
        {itemsQuery.isLoading ? (
          <LoadingSpinner />
        ) : itemsQuery.isError ? (
          <ErrorState
            message="Failed to load order items."
            onRetry={() => itemsQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">No items found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase">
                    Product ID
                  </th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase text-right">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase text-right">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase text-right">
                    Line Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.orderItemId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {item.productId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status History Timeline */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Status History</h2>
        {historyQuery.isLoading ? (
          <LoadingSpinner />
        ) : historyQuery.isError ? (
          <ErrorState
            message="Failed to load status history."
            onRetry={() => historyQuery.refetch()}
          />
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500">No history entries.</p>
        ) : (
          <div className="relative ml-3">
            <div className="absolute left-0 top-1 bottom-1 w-px bg-gray-200" />
            <div className="space-y-6">
              {history.map((entry) => (
                <div key={entry.id} className="relative flex gap-4 pl-6">
                  <div className="absolute left-0 top-1 -translate-x-1/2 flex h-2.5 w-2.5 items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full border-2 border-blue-500 bg-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={entry.toStatus} />
                      {entry.fromStatus && (
                        <span className="text-xs text-gray-400">
                          from {entry.fromStatus.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
                    </p>
                    {entry.changedBy && (
                      <p className="text-xs text-gray-400">
                        By: {entry.changedBy.slice(0, 8)}…
                      </p>
                    )}
                    {entry.reason && (
                      <p className="mt-0.5 text-xs italic text-gray-500">{entry.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CancelOrderDialog
        open={cancelOpen}
        loading={cancelMutation.isPending}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => cancelMutation.mutate(reason)}
      />
    </div>
  )
}
