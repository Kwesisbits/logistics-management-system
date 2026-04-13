import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  DRAFT: { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  PROCESSING: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  SUBMITTED: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400' },
  SHIPPED: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  CONFIRMED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  INACTIVE: { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-300' },
  STANDARD: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  URGENT: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
  ADMIN: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
  WAREHOUSE_STAFF: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  VIEWER: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  PARTIALLY_RECEIVED: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-400' },
  DRAFTED: { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400' },
}

const DEFAULT_STYLE = { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' }

interface StatusBadgeProps {
  status?: string | null
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null

  const style = STATUS_STYLES[status] ?? DEFAULT_STYLE
  const label = status.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide',
        style.bg,
        style.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {label}
    </span>
  )
}
