import { api, setCsrfToken } from '@/lib/api/client'
import type { AuthUser } from '@/lib/api/types'

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

/** Fetches CSRF token (cookie + response body for cross-origin production). */
export async function fetchCsrf(): Promise<void> {
  const { data } = await api.get<{ csrf_token?: string }>('/auth/csrf/')
  if (data.csrf_token) {
    setCsrfToken(data.csrf_token)
  }
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me/')
  return data
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/login/', payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/register/', payload)
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout/')
}

export async function googleLogin(credential: string): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/google/', { credential })
  return data
}

export const DEMO_CREDENTIALS: LoginPayload = {
  username: 'demo',
  password: 'DemoPassword123!',
}
