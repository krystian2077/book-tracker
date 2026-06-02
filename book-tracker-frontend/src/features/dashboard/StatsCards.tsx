import { BookMarked, BookOpen, CheckCircle2, Layers, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DashboardStats } from '@/lib/api/types'

function StatCard({
  label,
  value,
  icon: Icon,
  to,
}: {
  label: string
  value: string | number
  icon: typeof BookOpen
  to?: string
}) {
  const navigate = useNavigate()
  const baseClass =
    'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)]'
  const content = (
    <>
      <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
        <Icon size={16} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </>
  )

  if (!to) {
    return <div className={`${baseClass} hover:border-[var(--color-primary)]`}>{content}</div>
  }

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={`${baseClass} text-left hover:border-[var(--color-primary)] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]`}
    >
      {content}
    </button>
  )
}

export function StatsCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      <StatCard label="Total books" value={stats.total_books} icon={Layers} to="/library" />
      <StatCard
        label="Reading"
        value={stats.currently_reading}
        icon={BookOpen}
        to="/library?status=reading"
      />
      <StatCard
        label="Finished"
        value={stats.finished_books}
        icon={CheckCircle2}
        to="/library?status=finished"
      />
      <StatCard
        label="Avg rating"
        value={stats.average_rating !== null ? stats.average_rating.toFixed(1) : '—'}
        icon={Star}
        to="/library?rating=rated&sort=rating"
      />
      <StatCard
        label="Pages read"
        value={stats.total_pages_read.toLocaleString()}
        icon={BookMarked}
        to="/library?status=finished&sort=pages"
      />
    </div>
  )
}

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        />
      ))}
    </div>
  )
}
