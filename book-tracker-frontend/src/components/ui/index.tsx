import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertCircle, Loader2, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export { formatBookRating, RatingStars } from './RatingStars'

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
  secondary:
    'bg-[var(--color-surface-2)] text-[var(--color-text)] hover:bg-[var(--color-border)]',
  ghost: 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-2 sm:active:scale-100',
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cx(
        'w-full min-h-11 touch-manipulation rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-base text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] sm:min-h-0 sm:py-2 sm:text-sm',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cx(
      'w-full min-h-11 touch-manipulation rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-base text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] sm:min-h-0 sm:py-2 sm:text-sm',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cx(
      'w-full min-h-11 touch-manipulation rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-base text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] sm:min-h-0 sm:py-2 sm:text-sm',
      className,
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'

export function ErrorAlert({
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
}: {
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cx(
        'flex flex-col gap-3 rounded-xl border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/8 px-4 py-3 text-sm text-[var(--color-danger)] sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="flex items-start gap-2">
        <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
        <span>{message}</span>
      </p>
      {onRetry && (
        <Button variant="secondary" className="w-full shrink-0 sm:w-auto" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  // Wrapping the control in the label gives implicit, accessible association
  // without needing to thread an id through every input.
  return (
    <div className="space-y-1">
      <label className="block space-y-1">
        <span className="block text-sm font-medium">{label}</span>
        {children}
      </label>
      {error && (
        <p role="alert" className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 className="animate-spin text-[var(--color-text-muted)]" size={size} />
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cx(
        'relative inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] transition active:scale-95 hover:text-[var(--color-text)] focus-visible:outline-none sm:h-9 sm:w-9 sm:rounded-lg sm:active:scale-100',
        className,
      )}
    >
      <Sun
        size={18}
        className={cx(
          'absolute transition-all duration-300',
          isDark ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
        )}
      />
      <Moon
        size={18}
        className={cx(
          'absolute transition-all duration-300',
          isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0',
        )}
      />
    </button>
  )
}

const statusStyles: Record<string, string> = {
  want_to_read:
    'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] ring-1 ring-inset ring-[var(--color-border)]',
  reading:
    'bg-blue-500/10 text-blue-700 ring-1 ring-inset ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/20',
  finished:
    'bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20',
  paused:
    'bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20',
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status] ?? statusStyles.want_to_read,
      )}
    >
      {label}
    </span>
  )
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)] sm:h-2">
      <div
        className="h-full rounded-full bg-[var(--color-primary)] transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

