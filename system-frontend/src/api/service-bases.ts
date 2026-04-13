/**
 * Microservice base URLs. Lives under `api/` with no imports so Vite HMR cannot create
 * half-updated modules where named imports like `apiBases` fail at runtime.
 */
const DEFAULTS = {
  VITE_IDENTITY_SERVICE_URL: 'http://localhost:8081/api/v1/identity',
  VITE_INVENTORY_SERVICE_URL: 'http://localhost:8082/api/v1/inventory',
  VITE_WAREHOUSE_SERVICE_URL: 'http://localhost:8083/api/v1/warehouse',
  VITE_ORDERS_SERVICE_URL: 'http://localhost:8084/api/v1/orders',
  VITE_PROCUREMENT_SERVICE_URL: 'http://localhost:8085/api/v1/procurement',
  VITE_REPORTING_SERVICE_URL: 'http://localhost:8087/api/v1/reports',
} as const

type ServiceEnvKey = keyof typeof DEFAULTS

function resolveBase(key: ServiceEnvKey): string {
  const v = import.meta.env[key]
  if (typeof v === 'string' && v.trim() !== '') {
    return v.replace(/\/+$/, '')
  }
  const fb = DEFAULTS[key]
  console.warn(`[logistics-ui] ${key} is not set; using ${fb}`)
  return fb
}

export const serviceBases = {
  identity: resolveBase('VITE_IDENTITY_SERVICE_URL'),
  inventory: resolveBase('VITE_INVENTORY_SERVICE_URL'),
  warehouse: resolveBase('VITE_WAREHOUSE_SERVICE_URL'),
  orders: resolveBase('VITE_ORDERS_SERVICE_URL'),
  procurement: resolveBase('VITE_PROCUREMENT_SERVICE_URL'),
  reporting: resolveBase('VITE_REPORTING_SERVICE_URL'),
} as const

/** Legacy name kept for HMR / cached bundles that still reference `apiBases`. */
export const apiBases = serviceBases
