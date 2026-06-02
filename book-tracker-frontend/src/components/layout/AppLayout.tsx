import { NavLink } from 'react-router-dom'
import { PageTransition } from '@/components/layout/PageTransition'
import { BookOpen, LayoutDashboard, Library, LogOut, PlusCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { Button, ThemeToggle } from '@/components/ui'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/library', label: 'Library', icon: Library, end: false },
  { to: '/add', label: 'Add', icon: PlusCircle, end: false },
]

export function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell flex min-h-[100dvh]">
      <aside className="app-sidebar sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:flex md:w-64 lg:w-72 lg:p-5">
        <div className="mb-8 flex items-center gap-2.5 px-2 lg:mb-10">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
            <BookOpen className="text-[var(--color-primary)]" size={22} />
          </span>
          <span className="text-lg font-semibold tracking-tight lg:text-xl">Book Tracker</span>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'nav-link-active' : 'text-[var(--color-text-muted)]'
                }`
              }
            >
              <Icon size={18} />
              {label === 'Add' ? 'Add book' : label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-4 lg:pt-5">
          <span className="truncate text-sm text-[var(--color-text-muted)]">
            {user?.username}
          </span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-header sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/92 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
              <BookOpen className="shrink-0 text-[var(--color-primary)]" size={20} />
            </span>
            <span className="truncate text-base font-semibold tracking-tight">
              Book Tracker
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <span className="hidden max-w-[10rem] truncate text-sm text-[var(--color-text-muted)] md:inline lg:max-w-xs">
              {user?.username}
            </span>
            <span className="md:hidden">
              <ThemeToggle />
            </span>
            <Button
              variant="ghost"
              onClick={() => logout()}
              className="min-h-11 min-w-11 px-2 md:min-h-0 md:min-w-0 md:px-4"
              aria-label="Log out"
              data-testid="logout-button"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Log out</span>
            </Button>
          </div>
        </header>

        <main className="app-main mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:py-7 md:pb-8 lg:max-w-7xl lg:px-8 lg:py-8 xl:max-w-[90rem]">
          <PageTransition />
        </main>

        <nav
          className="app-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/96 backdrop-blur-md md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Main navigation"
        >
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-[3.25rem] min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition active:scale-95 ${
                    isActive
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                        isActive ? 'bg-[var(--color-primary)]/15 ring-1 ring-[var(--color-primary)]/25' : ''
                      }`}
                    >
                      <Icon size={22} strokeWidth={isActive ? 2.25 : 2} />
                    </span>
                    <span className="leading-tight">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
