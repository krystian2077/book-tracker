import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BookOpen } from 'lucide-react'
import { Button, Field, Input, ThemeToggle } from '@/components/ui'
import { getUserErrorMessage } from '@/lib/api/client'
import { useAuth } from './useAuth'
import { DEMO_CREDENTIALS } from './api'
import { GoogleSignInButton } from './GoogleSignInButton'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

export function AuthPage() {
  const { login, register: registerUser, loginWithGoogle } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [formError, setFormError] = useState<string | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  })

  const handleLogin = loginForm.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login(values)
    } catch (error) {
      setFormError(getUserErrorMessage(error, 'Login failed. Check your username and password.'))
    }
  })

  const handleRegister = registerForm.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await registerUser(values)
    } catch (error) {
      setFormError(getUserErrorMessage(error, 'Registration failed. Please check your details.'))
    }
  })

  const handleGoogle = async (credential: string) => {
    setFormError(null)
    try {
      await loginWithGoogle(credential)
    } catch (error) {
      setFormError(getUserErrorMessage(error, 'Google sign-in failed. Please try again.'))
    }
  }

  const handleDemo = async () => {
    setFormError(null)
    setDemoLoading(true)
    try {
      await login(DEMO_CREDENTIALS)
    } catch {
      setFormError('Demo account is not available. Seed demo data on the backend.')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="auth-shell flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <div
        className="fixed right-4 z-10"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <BookOpen className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-bold">Book Tracker</h1>
        </div>

        <div className="auth-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg shadow-black/[0.04] dark:shadow-black/30 sm:p-8">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-[var(--color-bg)] p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-md py-1.5 text-sm font-medium transition ${
                mode === 'login'
                  ? 'bg-[var(--color-surface-2)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-md py-1.5 text-sm font-medium transition ${
                mode === 'register'
                  ? 'bg-[var(--color-surface-2)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              Sign up
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <Field label="Username" error={loginForm.formState.errors.username?.message}>
                <Input {...loginForm.register('username')} autoComplete="username" />
              </Field>
              <Field label="Password" error={loginForm.formState.errors.password?.message}>
                <Input
                  type="password"
                  {...loginForm.register('password')}
                  autoComplete="current-password"
                />
              </Field>
              {formError && (
                <p role="alert" className="text-sm text-[var(--color-danger)]">
                  {formError}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                loading={loginForm.formState.isSubmitting}
              >
                Log in
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <Field
                label="Username"
                error={registerForm.formState.errors.username?.message}
              >
                <Input {...registerForm.register('username')} autoComplete="username" />
              </Field>
              <Field label="Email" error={registerForm.formState.errors.email?.message}>
                <Input
                  type="email"
                  {...registerForm.register('email')}
                  autoComplete="email"
                />
              </Field>
              <Field
                label="Password"
                error={registerForm.formState.errors.password?.message}
              >
                <Input
                  type="password"
                  {...registerForm.register('password')}
                  autoComplete="new-password"
                />
              </Field>
              {formError && (
                <p role="alert" className="text-sm text-[var(--color-danger)]">
                  {formError}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                loading={registerForm.formState.isSubmitting}
              >
                Create account
              </Button>
            </form>
          )}

          <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
            <GoogleSignInButton onCredential={handleGoogle} onError={setFormError} />
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleDemo}
              loading={demoLoading}
              data-testid="auth-demo-button"
            >
              Try the demo account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
