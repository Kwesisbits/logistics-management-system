export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface PaginationParams {
  page?: number
  limit?: number
  size?: number
  sortBy?: string
  order?: 'asc' | 'desc'
}

export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  empty: boolean
}

export function normalizeSpringPage<T>(raw: SpringPage<T> | PaginatedResponse<T> | T[]): PaginatedResponse<T> {
  if (Array.isArray(raw)) {
    return { data: raw, pagination: { page: 1, limit: raw.length, total: raw.length, totalPages: 1 } }
  }
  if ('content' in raw) {
    return {
      data: raw.content,
      pagination: {
        page: raw.number + 1,
        limit: raw.size,
        total: raw.totalElements,
        totalPages: raw.totalPages,
      },
    }
  }
  return raw as PaginatedResponse<T>
}

export interface ApiErrorDetail {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiErrorEnvelope {
  error: ApiErrorDetail
}

export type ErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_DEACTIVATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_STATE_TRANSITION'
  | 'OPTIMISTIC_LOCK_FAILURE'
  | 'VALIDATION_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
