import { Link } from 'react-router-dom'
import { Menu, ChevronDown, ShoppingCart } from 'lucide-react'
import useAuthStore from '../store/authStore'
import ThemeToggle from './ThemeToggle'
import { useOrdersTotalQuery } from '../hooks/useOrdersTotal'
import NotificationBell from './NotificationBell'

function Navbar({ pageTitle, onToggleSidebar }) {
  const user = useAuthStore((s) => s.user)
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
  const { data: ordersTotal = 0 } = useOrdersTotalQuery()
  const showOrdersLink = ['ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'].includes(user?.roleName)

  return (
    <header className="
      h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800
      flex items-center justify-between
      px-3 sm:px-4 lg:px-8
      sticky top-0 z-10
    ">

      <div className="flex items-center gap-2 sm:gap-4 min-w-0">

        {/* Hamburger */}
        <button
          onClick={onToggleSidebar}
          className="
            p-2 rounded-lg text-gray-600 dark:text-gray-300
            hover:bg-light-bg dark:hover:bg-gray-800 transition-colors duration-200
          "
        >
          <Menu size={22} />
        </button>

        {/* Page title */}
        <h2 className="text-base sm:text-lg font-semibold text-dark-base dark:text-white truncate">
          {pageTitle}
        </h2>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">

        <ThemeToggle />

        {showOrdersLink && (
          <Link
            to="/orders"
            className="
              relative flex items-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-lg
              text-gray-600 dark:text-gray-300
              hover:bg-light-bg dark:hover:bg-gray-800
              transition-colors duration-200
            "
            title="All orders"
          >
            <ShoppingCart size={20} className="flex-shrink-0" />
            <span className="hidden sm:inline text-xs font-semibold">Orders</span>
            <span
              className="
                min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full
                bg-medium-green text-white text-[10px] font-bold tabular-nums shadow-sm
              "
            >
              {ordersTotal > 999 ? '999+' : ordersTotal}
            </span>
          </Link>
        )}

        <NotificationBell />

        {/* User info */}
        <button className="
          flex items-center gap-2 lg:gap-3
          p-2 rounded-lg
          hover:bg-light-bg dark:hover:bg-gray-800 transition-colors duration-200
        ">
          {/* Avatar */}
          <div className="
            w-8 h-8 rounded-full bg-medium-green
            text-white font-bold text-sm
            flex items-center justify-center
            flex-shrink-0
          ">
            {initials}
          </div>

          {/* Name and role - hidden on small screens */}
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-sm font-semibold text-dark-base dark:text-white leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {user?.roleName ? user.roleName.replaceAll('_', ' ') : 'Role'}
            </span>
          </div>

          <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 hidden lg:block" />
        </button>

      </div>
    </header>
  )
}

export default Navbar