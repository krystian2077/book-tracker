import axios, { AxiosError } from 'axios'

/** Production fallback when VITE_API_BASE_URL is unset (signed CSRF supports cross-origin). */
const PRODUCTION_API = 'https://book-tracker-production-d6a1.up.railway.app'

function resolveBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL?.trim()
  if (env) return env.replace(/\/$/, '')
  return import.meta.env.PROD ? PRODUCTION_API : 'http://localhost:8000'
}

const BASE_URL = resolveBaseUrl()

/**
 * Shared Axios instance.
 *
 * - `withCredentials: true` so the browser sends/receives the httpOnly JWT
 *   cookies set by the backend.
 * - A request interceptor reads Django's CSRF cookie and echoes it back in the
 *   `X-CSRFToken` header for unsafe methods (double-submit cookie pattern).
 */
export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[2]) : null
}

/** In-memory CSRF token for cross-origin deploys (Vercel frontend + Railway API). */
let storedCsrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  storedCsrfToken = token
}

function resolveCsrfToken(): string | null {
  return storedCsrfToken ?? readCookie('csrftoken')
}

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase()
  if (UNSAFE_METHODS.has(method)) {
    const csrfToken = resolveCsrfToken()
    if (csrfToken) {
      config.headers.set('X-CSRFToken', csrfToken)
    }
  }
  return config
})

api.interceptors.response.use((response) => {
  const rawContentType = response.headers['content-type']
  const contentType = typeof rawContentType === 'string' ? rawContentType : ''
  if (
    contentType.includes('text/html') &&
    typeof response.data === 'string' &&
    response.data.includes('<!doctype html')
  ) {
    return Promise.reject(
      new AxiosError(
        'API misconfigured: received the app page instead of JSON. Set VITE_API_BASE_URL to your Railway backend URL on Vercel.',
        AxiosError.ERR_BAD_RESPONSE,
        response.config,
        response.request,
        response,
      ),
    )
  }
  return response
})

/** Shape of DRF validation error responses: `{ field: [messages] }`. */
export type ApiFieldErrors = Record<string, string[] | string>

export interface NormalizedApiError {
  status: number | null
  detail: string | null
  fieldErrors: ApiFieldErrors
}

const TECHNICAL_AXIOS_DETAIL = /^Request failed with status code \d+$/

function isTechnicalDetail(detail: string | null): boolean {
  if (!detail) return true
  if (detail === 'Network Error') return true
  return TECHNICAL_AXIOS_DETAIL.test(detail)
}

/** Convert an unknown thrown value into a predictable error shape for the UI. */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null
    const data = error.response?.data as Record<string, unknown> | undefined
    const rawDetail =
      typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail) && typeof data.detail[0] === 'string'
          ? data.detail[0]
          : null
    const detail = isTechnicalDetail(rawDetail) ? null : rawDetail
    const fieldErrors: ApiFieldErrors = {}
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        if (key === 'detail') continue
        if (Array.isArray(value) || typeof value === 'string') {
          fieldErrors[key] = value as string[] | string
        }
      }
    }
    return { status, detail, fieldErrors }
  }
  const message = error instanceof Error ? error.message : null
  return {
    status: null,
    detail: isTechnicalDetail(message) ? null : message,
    fieldErrors: {},
  }
}

/** First field-level message from a normalized API error, if any. */
export function firstFieldErrorMessage(fieldErrors: ApiFieldErrors): string | null {
  for (const value of Object.values(fieldErrors)) {
    if (Array.isArray(value) && value[0]) return value[0]
    if (typeof value === 'string' && value) return value
  }
  return null
}

/**
 * Single user-facing string for banners and alerts.
 * Prefers server field errors, then `detail`, then status-based fallbacks.
 */
export function getUserErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const normalized = normalizeApiError(error)
  const fieldMessage = firstFieldErrorMessage(normalized.fieldErrors)
  if (fieldMessage) return fieldMessage

  if (normalized.detail) {
    if (/csrf/i.test(normalized.detail)) {
      return 'Security check failed. Refresh the page and try again.'
    }
    return normalized.detail
  }

  const { status } = normalized
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'The requested item was not found.'
  if (status != null && status >= 500) return 'Server error. Please try again in a moment.'
  if (status === null && error instanceof AxiosError && !error.response) {
    return 'Could not reach the server. Check your connection and try again.'
  }

  return fallback
}
