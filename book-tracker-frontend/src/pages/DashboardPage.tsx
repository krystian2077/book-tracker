import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { useBookNavigation } from '@/hooks/useBookNavigation'
import { ErrorAlert } from '@/components/ui'
import { getUserErrorMessage } from '@/lib/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { LibraryList } from '@/features/library/LibraryList'
import { useLibrary } from '@/features/library/useLibrary'
import { dashboardKeys, fetchDashboard } from '@/features/dashboard/api'
import { DashboardSearch } from '@/features/dashboard/DashboardSearch'
import { StatsCards, StatsCardsSkeleton } from '@/features/dashboard/StatsCards'
import { CurrentlyReading } from '@/features/dashboard/CurrentlyReading'

export function DashboardPage() {
  const { user } = useAuth()
  const openBook = useBookNavigation()
  const recentState = useLibrary({ sort: 'newest' })
  const dashboard = useQuery({
    queryKey: dashboardKeys.all,
    queryFn: fetchDashboard,
  })

  return (
    <div className="space-y-8 lg:space-y-10">
      <PageHeader
        title={`Welcome back${user?.username ? `, ${user.username}` : ''}`}
        description="Here is your reading at a glance."
      />

      <DashboardSearch onOpenBook={openBook} />

      {dashboard.isError && (
        <ErrorAlert
          message={getUserErrorMessage(
            dashboard.error,
            'Could not load your reading stats. Please try again.',
          )}
          onRetry={() => dashboard.refetch()}
        />
      )}

      {dashboard.isLoading || !dashboard.data ? (
        !dashboard.isError && <StatsCardsSkeleton />
      ) : (
        <StatsCards stats={dashboard.data} />
      )}

      {dashboard.data && (
        <CurrentlyReading
          reading={dashboard.data.reading}
          onOpenBook={(ub) => openBook(ub.id)}
        />
      )}

      <section>
        <h2 className="section-heading mb-3 sm:mb-4">Recently added</h2>
        <LibraryList state={recentState} onOpenBook={(ub) => openBook(ub.id)} />
      </section>
    </div>
  )
}
