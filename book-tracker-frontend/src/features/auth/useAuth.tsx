import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuthUser } from '@/lib/api/types'
import {
  fetchCsrf,
  fetchMe,
  googleLogin as googleLoginRequest,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type LoginPayload,
  type RegisterPayload,
} from './api'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  loginWithGoogle: (credential: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  // Ensure the CSRF cookie exists before any unsafe (POST/PATCH/DELETE) request.
  useEffect(() => {
    void fetchCsrf()
  }, [])

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60_000,
  })

  const setUser = useCallback(
    (user: AuthUser) => queryClient.setQueryData(['auth', 'me'], user),
    [queryClient],
  )

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: setUser,
  })

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: setUser,
  })

  const googleMutation = useMutation({
    mutationFn: googleLoginRequest,
    onSuccess: setUser,
  })

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.clear()
    },
  })

  const value: AuthContextValue = {
    user: meQuery.data ?? null,
    isLoading: meQuery.isLoading,
    isAuthenticated: !!meQuery.data,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    loginWithGoogle: googleMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
