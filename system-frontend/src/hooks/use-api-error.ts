import type { AxiosError } from 'axios'
import type { ApiErrorEnvelope } from '@/types/api'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated. Contact your administrator.',
  FORBIDDEN: "You don't have permission to perform this action",
  NOT_FOUND: 'This record could not be found',
  CONFLICT: 'A duplicate record already exists',
  INSUFFICIENT_STOCK: 'Insufficient stock. See details below.',
  INVALID_STATE_TRANSITION: 'This action is not allowed at the current stage',
  OPTIMISTIC_LOCK_FAILURE: 'This record was updated by someone else. Please refresh and try again.',
  VALIDATION_ERROR: 'Please fix the validation errors below',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again in a moment.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
}

export function getApiErrorMessage(error: unknown): string {
  const axiosErr = error as AxiosError<ApiErrorEnvelope>
  const code = axiosErr?.response?.data?.error?.code
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  const msg = axiosErr?.response?.data?.error?.message
  if (msg) return msg
  return 'Something went wrong. Please try again.'
}

export function getApiErrorCode(error: unknown): string | null {
  const axiosErr = error as AxiosError<ApiErrorEnvelope>
  return axiosErr?.response?.data?.error?.code ?? null
}

export function getApiErrorDetails(error: unknown): Record<string, unknown> | undefined {
  const axiosErr = error as AxiosError<ApiErrorEnvelope>
  return axiosErr?.response?.data?.error?.details
}
