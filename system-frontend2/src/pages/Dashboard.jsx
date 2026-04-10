import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart, AlertTriangle, ClipboardList,
  Clock, TrendingUp, TrendingDown, ArrowRight, Plus,
  Box, DollarSign, Activity, ArrowUpRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { inventoryApi, ordersApi, procurementApi, warehouseApi } from '../services/axiosInstance'

/* ─── helpers ─────────────────────────────────────── */
const statusStyles = {
  PENDING:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  SHIPPED:    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  DELIVERED:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CANCELLED:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  picking:    'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed:  'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300',
  shipped:    'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900',
}
const priorityStyles = {
  HIGH:   'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  LOW:    'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}
function StatusBadge({ status }) {
  const key = status?.toLowerCase()
  const style = statusStyles[key] || statusStyles[status] || 'bg-gray-100 text-gray-500'
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${style}`}>
      {status}
    </span>
  )
}
function PriorityBadge({ priority }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${priorityStyles[priority] || 'bg-gray-100 text-gray-500'}`}>
      {priority}
    </span>
  )
}

/* ─── Sparkline SVG (animated on mount) ──────────────── */
function Sparkline({ color = '#6ee7b7', animate = false }) {
  const points = [4, 7, 5, 9, 6, 11, 8, 10, 7, 13, 9, 11, 14, 10, 13]
  const max = Math.max(...points); const min = Math.min(...points)
  const norm = points.map(p => 1 - (p - min) / (max - min))
  const w = 120; const h = 36
  const coords = norm.map((y, i) => `${(i / (points.length - 1)) * w},${y * h}`)
  const d = `M${coords.join(' L')}`

  const pathRef = useRef(null)
  useEffect(() => {
    if (!animate || !pathRef.current) return
    const len = pathRef.current.getTotalLength()
    pathRef.current.style.strokeDasharray = len
    pathRef.current.style.strokeDashoffset = len
    pathRef.current.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1) 0.3s'
    requestAnimationFrame(() => { pathRef.current.style.strokeDashoffset = '0' })
  }, [animate])
  
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#sg-${color.replace('#','')})`} />
      <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ─── Animated counter ───────────────────────────────── */
function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const target = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0
  useEffect(() => {
    let start = null
    const duration = 900
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
      else setDisplay(target)
    }
    requestAnimationFrame(step)
  }, [target])
  return <>{prefix}{typeof value === 'string' && value.includes('M') ? `${display}M` : display}{suffix}</>
}

/* ─── Pie Chart (CSS conic-gradient, animated) ──────── */
const PIE_DATA = [
  { label: 'Electronics', pct: 45, color: '#6366f1' },
  { label: 'Furniture',   pct: 30, color: '#10b981' },
  { label: 'Apparel',     pct: 15, color: '#f59e0b' },
  { label: 'Others',      pct: 10, color: '#a78bfa' },
]

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function pieSlicePath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

function PieChart({ animate }) {
  const [scale, setScale] = useState(0)
  const [hover, setHover] = useState(null)
  const cx = 72
  const cy = 72
  const r = 64

  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setScale(1), 100)
    return () => clearTimeout(t)
  }, [animate])

  let cum = 0
  const slices = PIE_DATA.map((d) => {
    const startAngle = cum * 3.6
    cum += d.pct
    const endAngle = cum * 3.6
    return { ...d, startAngle, endAngle, path: pieSlicePath(cx, cy, r, startAngle, endAngle) }
  })

  return (
    <div className="flex items-center gap-6 pt-2 relative">
      <svg
        viewBox="0 0 144 144"
        className="w-36 h-36 flex-shrink-0 overflow-visible"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.7s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        {slices.map((s) => (
          <path
            key={s.label}
            d={s.path}
            fill={s.color}
            stroke="#fff"
            strokeWidth="2"
            className="cursor-pointer transition-opacity hover:opacity-90"
            onMouseEnter={(e) => {
              setHover({
                label: s.label,
                pct: s.pct,
                x: e.clientX + 14,
                y: e.clientY - 8,
              })
            }}
            onMouseMove={(e) => {
              setHover({
                label: s.label,
                pct: s.pct,
                x: e.clientX + 14,
                y: e.clientY - 8,
              })
            }}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <div className="space-y-2">
        {PIE_DATA.map(d => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{d.label}:</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{d.pct}%</span>
          </div>
        ))}
      </div>
      {hover && (
        <div
          className="fixed z-50 app-card px-3 py-2 text-xs pointer-events-none shadow-lg max-w-[220px]"
          style={{ left: hover.x, top: hover.y }}
        >
          <p className="font-semibold text-gray-800">{hover.label}</p>
          <p className="text-gray-600 tabular-nums">
            Share: <span className="font-bold text-gray-900">{hover.pct}%</span>
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Line Chart (SVG, animated on mount) ───────────── */
const TREND_ORDERS = [14, 18, 15, 22, 19, 27, 21]
const TREND_REVENUE = [8500, 12000, 9800, 18000, 15000, 25500, 20000]
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function TrendChart({ animate }) {
  const [hover, setHover] = useState(null)
  const w = 400; const h = 140; const pad = { t:10, b:30, l:30, r:10 }
  const cw = w - pad.l - pad.r; const ch = h - pad.t - pad.b

  const norm = (arr) => {
    const mn = Math.min(...arr), mx = Math.max(...arr)
    return arr.map(v => 1 - (v - mn) / (mx - mn))
  }
  const mkPath = (arr) => {
    const pts = norm(arr)
    return pts.map((y, i) => `${pad.l + (i/(pts.length-1))*cw},${pad.t + y*ch}`).join(' ')
  }

  const ordPath = `M${mkPath(TREND_ORDERS).split(' ').join(' L')}`
  const revPath = `M${mkPath(TREND_REVENUE).split(' ').join(' L')}`

  const lineRef1 = useRef(null)
  const lineRef2 = useRef(null)
  useEffect(() => {
    if (!animate) return
    [lineRef1, lineRef2].forEach((ref, i) => {
      if (!ref.current) return
      const len = ref.current.getTotalLength()
      ref.current.style.strokeDasharray = len
      ref.current.style.strokeDashoffset = len
      ref.current.style.transition = `stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1) ${0.2 + i*0.15}s`
      requestAnimationFrame(() => { ref.current.style.strokeDashoffset = '0' })
    })
  }, [animate])

  const bandW = cw / Math.max(DAYS.length - 1, 1) * 0.85
  function moveTip(e, i) {
    let left = e.clientX + 12
    let top = e.clientY - 72
    if (left + 220 > window.innerWidth - 8) left = e.clientX - 232
    if (top < 8) top = e.clientY + 16
    setHover({
      i,
      day: DAYS[i],
      orders: TREND_ORDERS[i],
      revenue: TREND_REVENUE[i],
      x: left,
      y: top,
    })
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 140 }}>
        <defs>
          <linearGradient id="ordFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0,0.33,0.67,1].map((v,i) => (
          <line key={i} x1={pad.l} y1={pad.t + v*ch} x2={pad.l+cw} y2={pad.t + v*ch}
            stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"/>
        ))}
        <path d={`${ordPath} L${pad.l+cw},${pad.t+ch} L${pad.l},${pad.t+ch} Z`} fill="url(#ordFill)"/>
        <path d={`${revPath} L${pad.l+cw},${pad.t+ch} L${pad.l},${pad.t+ch} Z`} fill="url(#revFill)"/>
        <path ref={lineRef1} d={ordPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path ref={lineRef2} d={revPath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3"/>
        {DAYS.map((d,i) => (
          <text key={d} x={pad.l + (i/(DAYS.length-1))*cw} y={h-6} textAnchor="middle"
            fontSize="9" fill="currentColor" opacity="0.4">{d}</text>
        ))}
        {DAYS.map((_, i) => (
          <rect
            key={`band-${i}`}
            x={pad.l + (i/(DAYS.length-1))*cw - bandW/2}
            y={pad.t}
            width={bandW}
            height={ch}
            fill="transparent"
            className="cursor-crosshair"
            onMouseEnter={(e) => moveTip(e, i)}
            onMouseMove={(e) => moveTip(e, i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover && (
        <div
          className="fixed z-50 app-card px-3 py-2.5 text-xs pointer-events-none shadow-lg"
          style={{ left: hover.x, top: hover.y }}
        >
          <p className="font-semibold text-gray-800 border-b border-gray-100 pb-1 mb-1.5">{hover.day}</p>
          <p className="text-gray-700">
            Orders: <span className="font-bold tabular-nums text-emerald-700">{hover.orders}</span>
          </p>
          <p className="text-gray-700 mt-0.5">
            Revenue: <span className="font-bold tabular-nums text-indigo-700">GHS {hover.revenue.toLocaleString()}</span>
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Warehouse Bar Chart ────────────────────────────── */
const WH_DATA = [
  { name:'CDC', total:100, used:75 },
  { name:'WCF', total:80,  used:48 },
  { name:'SRH', total:60,  used:38 },
]

function WarehouseChart({ animate }) {
  const [barH, setBarH] = useState(WH_DATA.map(() => 0))
  const [hover, setHover] = useState(null)
  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setBarH(WH_DATA.map(d => d.used / d.total)), 200)
    return () => clearTimeout(t)
  }, [animate])

  return (
    <div
      className="relative mt-3"
      onMouseLeave={() => setHover(null)}
    >
    <div className="flex items-end gap-6 h-28">
      {WH_DATA.map((wh, i) => (
        <div
          key={wh.name}
          className="flex-1 flex flex-col items-center gap-1 relative"
          onMouseEnter={(e) => {
            const used = Math.round(barH[i] * wh.total)
            setHover({
              name: wh.name,
              used,
              total: wh.total,
              x: e.clientX + 12,
              y: e.clientY - 56,
            })
          }}
          onMouseMove={(e) => {
            const used = Math.round(barH[i] * wh.total)
            setHover({
              name: wh.name,
              used,
              total: wh.total,
              x: e.clientX + 12,
              y: e.clientY - 56,
            })
          }}
        >
          <div className="w-full relative flex items-end h-20 gap-1 rounded overflow-hidden cursor-pointer">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded" style={{ height: '100%' }} />
            <div
              className="absolute left-0 bottom-0 w-full rounded"
              style={{
                background: 'linear-gradient(180deg, #6ea8fe 0%, #3b82f6 100%)',
                height: `${barH[i] * 100}%`,
                transition: `height 0.8s cubic-bezier(.34,1.56,.64,1) ${i * 0.12}s`,
                opacity: 0.85,
              }}
            />
          </div>
          <span className="text-xs text-gray-400">{wh.name}</span>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{Math.round(barH[i]*wh.total)}K/{wh.total}K</span>
        </div>
      ))}
      <div className="flex flex-col gap-1.5 self-end pb-1 text-xs text-gray-400">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600"/> Capacity</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-400"/> Used</div>
      </div>
      {hover && (
        <div
          className="fixed z-50 app-card px-3 py-2 text-xs pointer-events-none shadow-lg"
          style={{ left: hover.x, top: hover.y }}
        >
          <p className="font-semibold text-gray-800">{hover.name}</p>
          <p className="text-gray-600 mt-0.5">
            Used: <span className="font-bold text-blue-700 tabular-nums">{hover.used}K</span>
            {' '}/{' '}
            <span className="tabular-nums">{hover.total}K</span> capacity
          </p>
        </div>
      )}
    </div>
    </div>
  )
}

/* ─── Main Dashboard ─────────────────────────────────── */
function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.roleName === 'ADMIN'
  const isStaff = user?.roleName === 'WAREHOUSE_STAFF'
  const warehouseId = isStaff ? user?.warehouseId : undefined

  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t) }, [])

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['dashboard', 'low-stock', warehouseId],
    queryFn: async () => {
      const r = await inventoryApi.get('/stock/low-stock', { params: { warehouseId } })
      return Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.items ?? [])
    },
    refetchInterval: 60_000, staleTime: 0,
  })
  const { data: ordersData } = useQuery({
    queryKey: ['dashboard', 'orders', warehouseId],
    queryFn: async () => {
      const r = await ordersApi.get('/', { params: { warehouseId, page: 1, limit: 10, sortBy: 'createdAt', order: 'desc' } })
      return r.data
    },
    staleTime: 0,
  })
  const { data: receiptsData } = useQuery({
    queryKey: ['dashboard', 'receipts', warehouseId],
    queryFn: async () => {
      const r = await warehouseApi.get('/receipts', { params: { warehouseId, status: 'PENDING', page: 1, limit: 20 } })
      return r.data
    },
    staleTime: 0,
  })
  const { data: poData } = useQuery({
    queryKey: ['dashboard', 'purchase-orders', warehouseId],
    queryFn: async () => {
      const r = await procurementApi.get('/purchase-orders', { params: { warehouseId, status: 'SUBMITTED', page: 1, limit: 100 } })
      return r.data
    },
    staleTime: 30_000,
  })

  const recentOrders = ordersData?.data ?? []
  const orderTotalCount = ordersData?.pagination?.total ?? recentOrders.length
  const pendingReceipts = receiptsData?.data ?? []
  const overduePOs = (poData?.data ?? []).filter(po => po.expectedDelivery && new Date(po.expectedDelivery) < new Date()).length

  /* ── KPI card config — with hoverBg for color-matched hover ── */
  const summaryCards = [
    {
      label: 'Total Products', value: 245,
      prefix: '', suffix: '',
      change: '+12.5%', trend: 'up', vsLabel: 'vs last week',
      icon: Box,
      sparkColor: '#6366f1',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
      iconColor: 'text-indigo-500',
      hoverBg: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
      hoverBorder: 'hover:border-indigo-200 dark:hover:border-indigo-700',
    },
    {
      label: 'Active Orders', value: orderTotalCount,
      prefix: '', suffix: '',
      change: '+8.2%', trend: 'up', vsLabel: 'vs last week',
      icon: ShoppingCart,
      sparkColor: '#10b981',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-500',
      hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
      hoverBorder: 'hover:border-emerald-200 dark:hover:border-emerald-700',
    },
    {
      label: 'Low Stock Items', value: lowStockItems.length || 12,
      prefix: '', suffix: '',
      change: '-3.1%', trend: 'down', vsLabel: 'vs last week',
      icon: AlertTriangle,
      sparkColor: '#f97316',
      iconBg: 'bg-orange-100 dark:bg-orange-900/40',
      iconColor: 'text-orange-400',
      hoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-950/30',
      hoverBorder: 'hover:border-orange-200 dark:hover:border-orange-700',
    },
    {
      label: 'Inventory Value', value: '2.46',
      prefix: '$', suffix: 'M',
      change: '+15.3%', trend: 'up', vsLabel: 'vs last week',
      icon: DollarSign,
      sparkColor: '#a78bfa',
      iconBg: 'bg-violet-100 dark:bg-violet-900/40',
      iconColor: 'text-violet-500',
      hoverBg: 'hover:bg-violet-50 dark:hover:bg-violet-950/30',
      hoverBorder: 'hover:border-violet-200 dark:hover:border-violet-700',
    },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero banner ── */}
      <div
        className="relative overflow-hidden rounded-2xl px-8 py-7 border border-deep-green/20 text-dark-base"
        style={{ backgroundColor: '#B0E4CC' }}
      >
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-medium-green/15 pointer-events-none" />
        <div className="absolute right-24 bottom-0 w-24 h-24 rounded-full bg-deep-green/10 pointer-events-none" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.firstName || 'User'}! 👋
            </h2>
            <p className="mt-1 text-sm text-dark-base/75">
              Here's what's happening with your logistics operations today.
            </p>
            {warehouseId && (
              <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 text-xs font-semibold border border-deep-green/25 text-dark-base">
                🏭 Assigned to Warehouse: {warehouseId}
              </span>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs text-dark-base/60 mb-1 font-medium">Total orders</p>
            <div className="flex items-center gap-1 justify-end">
              <Activity size={16} className="text-deep-green" />
              <span className="text-2xl font-bold text-dark-base tabular-nums">{orderTotalCount}</span>
            </div>
          </div>
        </div>

        {(isAdmin || isStaff) && (
          <button
            onClick={() => navigate('/orders/new')}
            className="mt-5 flex items-center gap-2 px-4 py-2 bg-deep-green hover:bg-medium-green
              active:scale-95 text-white text-sm font-semibold rounded-lg
              transition-all duration-200 shadow-sm w-fit"
          >
            <Plus size={15} /> New Order
          </button>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`
                group app-card p-5
                ${card.hoverBorder}
                ${card.hoverBg}
                hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/90 dark:hover:shadow-gray-900
                active:scale-[0.98]
                transition-all duration-200 ease-out cursor-pointer
                opacity-0
              `}
              style={{
                animation: ready ? `fadeSlideUp 0.5s ease forwards ${idx * 0.09}s` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                <div className={`p-2.5 rounded-xl ${card.iconBg} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={18} className={card.iconColor} />
                </div>
              </div>

              <p className="text-3xl font-bold text-gray-800 dark:text-white mb-0.5">
                {card.prefix ?? ''}<AnimatedNumber value={card.value} />{card.suffix ?? ''}
              </p>

              <Sparkline color={card.sparkColor} animate={ready} />

              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1">
                  {card.trend === 'up'
                    ? <TrendingUp size={13} className="text-emerald-500" />
                    : <TrendingDown size={13} className="text-red-400" />}
                  <span className={`text-xs font-semibold ${card.trend === 'up' ? 'text-emerald-500' : 'text-red-400'}`}>
                    {card.change}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{card.vsLabel}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Order & Revenue Trends */}
        <div className="app-card p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Order &amp; Revenue Trends</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 7 days performance</p>
            </div>
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowUpRight size={15} className="text-gray-400"/>
            </button>
          </div>
          <div className="flex gap-4 text-xs mb-2 mt-2">
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-emerald-500 inline-block"/><span className="text-gray-400">Orders</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-indigo-400 inline-block border-dashed"/><span className="text-gray-400">Revenue</span></div>
          </div>
          <TrendChart animate={ready} />
        </div>

        {/* Stock Distribution */}
        <div className="app-card p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Stock Distribution by Category</h3>
              <p className="text-xs text-gray-400 mt-0.5">Current inventory breakdown</p>
            </div>
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowUpRight size={15} className="text-gray-400"/>
            </button>
          </div>
          <PieChart animate={ready} />
        </div>
      </div>

      {/* ── Warehouse Capacity ── */}
      <div className="app-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Warehouse Capacity Utilization</h3>
            <p className="text-xs text-gray-400 mt-0.5">Current space usage across facilities</p>
          </div>
        </div>
        <WarehouseChart animate={ready} />
      </div>

      {/* ── Bottom: Recent Orders + Low Stock ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Recent Orders — wider */}
        <div className="xl:col-span-3 app-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Recent Orders</h3>
              <p className="text-xs text-gray-400">Latest order activity</p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1 text-emerald-600 text-sm font-medium hover:underline hover:text-emerald-700 transition-colors"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {recentOrders.map((order) => (
              <div
                key={order.orderId}
                onClick={() => navigate(`/orders/${order.orderId}`)}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer group rounded-lg mx-1 my-0.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-emerald-600 transition-colors truncate">
                    {order.orderId}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{order.customerName ?? order.customerId ?? '—'}</p>
                </div>
                <StatusBadge status={order.status} />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  GHS {(order.totalAmount ?? 0).toLocaleString()}
                </span>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <p className="px-6 py-8 text-sm text-center text-gray-400">No recent orders</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="xl:col-span-2 app-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Low Stock Alerts</h3>
              <p className="text-xs text-gray-400">Items requiring reorder</p>
            </div>
            <AlertTriangle size={17} className="text-orange-400" />
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {lowStockItems.map((item) => (
              <div
                key={item.sku ?? item.productId}
                className="px-6 py-4 hover:bg-orange-50/40 dark:hover:bg-orange-900/10 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white leading-snug group-hover:text-orange-500 transition-colors">
                    {item.name ?? item.productName ?? item.productId}
                  </p>
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0
                    ${(item.quantityAvailable ?? 0) === 0
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                      : 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300'
                    }`}>
                    {(item.quantityAvailable ?? 0) === 0 ? 'OUT' : `${item.quantityAvailable} units`}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{item.sku ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Reorder at: {item.reorderThreshold ?? 0}</p>
                <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${(item.quantityAvailable ?? 0) === 0 ? 'bg-red-400' : 'bg-orange-400'}`}
                    style={{ width: `${Math.min(((item.quantityAvailable ?? 0) / (item.reorderThreshold || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <p className="px-6 py-8 text-sm text-center text-gray-400">All stock levels healthy ✓</p>
            )}
          </div>
        </div>

      </div>

      {/* ── Pending Receipts & Purchase Orders ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Pending Receipts */}
        <div className="app-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Pending Receipts</h3>
              <p className="text-xs text-gray-400">Awaiting confirmation</p>
            </div>
            <button
              onClick={() => navigate('/receipts')}
              className="flex items-center gap-1 text-emerald-600 text-sm font-medium hover:underline hover:text-emerald-700 transition-colors"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {pendingReceipts.slice(0, 5).map((receipt) => (
              <div
                key={receipt.receiptId ?? receipt.id}
                onClick={() => navigate(`/receipts/${receipt.receiptId ?? receipt.id}`)}
                className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group rounded-lg mx-1 my-0.5"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <ClipboardList size={16} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                    {receipt.receiptId ?? receipt.id ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {receipt.supplierName ?? receipt.supplier ?? 'Unknown supplier'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    PENDING
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {receipt.expectedDate
                      ? new Date(receipt.expectedDate).toLocaleDateString()
                      : receipt.createdAt
                        ? new Date(receipt.createdAt).toLocaleDateString()
                        : '—'}
                  </p>
                </div>
              </div>
            ))}
            {pendingReceipts.length === 0 && (
              <p className="px-6 py-8 text-sm text-center text-gray-400">No pending receipts</p>
            )}
          </div>
        </div>

        {/* Purchase Orders Overview */}
        <div className="app-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Purchase Orders</h3>
              <p className="text-xs text-gray-400">Submitted & awaiting delivery</p>
            </div>
            <div className="flex items-center gap-2">
              {overduePOs > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
                  {overduePOs} overdue
                </span>
              )}
              <button
                onClick={() => navigate('/procurement')}
                className="flex items-center gap-1 text-emerald-600 text-sm font-medium hover:underline hover:text-emerald-700 transition-colors"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {(poData?.data ?? []).slice(0, 5).map((po) => {
              const isOverdue = po.expectedDelivery && new Date(po.expectedDelivery) < new Date()
              return (
                <div
                  key={po.poId ?? po.id}
                  onClick={() => navigate(`/procurement/${po.poId ?? po.id}`)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors cursor-pointer group rounded-lg mx-1 my-0.5"
                >
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                    ${isOverdue ? 'bg-red-100 dark:bg-red-900/40' : 'bg-violet-100 dark:bg-violet-900/40'}`}>
                    <Clock size={16} className={isOverdue ? 'text-red-500' : 'text-violet-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-violet-600 transition-colors truncate">
                      {po.poId ?? po.id ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {po.supplierName ?? po.supplier ?? 'Unknown supplier'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isOverdue ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
                        OVERDUE
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                        SUBMITTED
                      </span>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {po.expectedDelivery
                        ? new Date(po.expectedDelivery).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </div>
              )
            })}
            {(poData?.data ?? []).length === 0 && (
              <p className="px-6 py-8 text-sm text-center text-gray-400">No submitted purchase orders</p>
            )}
          </div>
        </div>

      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default Dashboard