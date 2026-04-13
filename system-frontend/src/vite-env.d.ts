/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IDENTITY_SERVICE_URL?: string
  readonly VITE_INVENTORY_SERVICE_URL?: string
  readonly VITE_WAREHOUSE_SERVICE_URL?: string
  readonly VITE_ORDERS_SERVICE_URL?: string
  readonly VITE_PROCUREMENT_SERVICE_URL?: string
  readonly VITE_REPORTING_SERVICE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
