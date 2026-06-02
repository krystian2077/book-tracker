import { useState } from 'react'
import { ArrowRight, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Input, Spinner } from '@/components/ui'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { isIsbnLikeInput } from '@/lib/schemas/book'
import { READING_STATUS_LABELS, type ReadingStatus } from '@/lib/api/types'
import { LibraryList } from '@/features/library/LibraryList'
import { useLibrary } from '@/features/library/useLibrary'

const STATUS_FILTERS = [
  { value: 'all', label: 'All books' },
  ...(Object.entries(READING_STATUS_LABELS) as Array<[ReadingStatus, string]>).map(
    ([value, label]) => ({ value, label }),
  ),
]

export function DashboardSearch({
  onOpenBook,
}: {
  onOpenBook: (id: number) => void
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const debouncedSearch = useDebouncedValue(search, 300)
  const effectiveSearch =
    debouncedSearch.trim().length >= 2 || isIsbnLikeInput(debouncedSearch)
      ? debouncedSearch.trim()
      : ''

  const isActive = effectiveSearch.length > 0 || status !== 'all'
  const isSearching = search !== debouncedSearch

  const libraryState = useLibrary(
    {
      search: effectiveSearch,
      status,
      rating: 'all',
      sort: effectiveSearch ? 'relevance' : 'newest',
    },
    { enabled: isActive },
  )

  const libraryUrl = buildLibraryUrl(effectiveSearch, status)

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm shadow-black/[0.04] dark:shadow-black/25"
      aria-label="Search your library"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/[0.07] via-transparent to-[var(--color-primary)]/[0.03]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--color-primary)]/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[var(--color-primary)]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold sm:text-lg">Find a book</h2>
              <p className="text-xs text-[var(--color-text-muted)] sm:text-sm">
                Search by title, author or ISBN
              </p>
            </div>
          </div>
          {isActive && (
            <Link
              to={libraryUrl}
              className="hidden shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 sm:inline-flex"
            >
              Open in library
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[var(--color-primary)]"
            size={20}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Dune, Asimov, 978-0-307-26908-2…"
            className="h-12 border-2 border-[var(--color-border)] bg-[var(--color-bg)]/80 pl-12 pr-12 text-base shadow-inner backdrop-blur-sm transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_18%,transparent)] sm:h-14 sm:pl-12 sm:text-lg"
            aria-label="Search books"
            enterKeyHint="search"
          />
          {(isSearching || (isActive && libraryState.isFetching)) && (
            <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2">
              <Spinner size={20} />
            </div>
          )}
        </div>

        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Filter by reading status"
        >
          {STATUS_FILTERS.map(({ value, label }) => {
            const selected = status === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition sm:text-sm ${
                  selected
                    ? 'bg-[var(--color-primary)] text-white shadow-sm shadow-[var(--color-primary)]/25'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] ring-1 ring-inset ring-[var(--color-border)] hover:text-[var(--color-text)]'
                }`}
                aria-pressed={selected}
              >
                {label}
              </button>
            )
          })}
        </div>

        {isActive && (
          <div className="mt-6 border-t border-[var(--color-border)] pt-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                {effectiveSearch ? (
                  <>
                    Results for{' '}
                    <span className="text-[var(--color-text)]">&ldquo;{effectiveSearch}&rdquo;</span>
                  </>
                ) : (
                  'Filtered books'
                )}
              </p>
              <Link
                to={libraryUrl}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--color-primary)] sm:hidden"
              >
                Library
                <ArrowRight size={14} />
              </Link>
            </div>
            <LibraryList
              state={libraryState}
              onOpenBook={(ub) => onOpenBook(ub.id)}
              emptyMessage="No books match your search. Try another title, author or ISBN."
            />
          </div>
        )}

        {!isActive && (
          <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
            Type at least 2 characters, or paste an ISBN to search instantly
          </p>
        )}
      </div>
    </section>
  )
}

function buildLibraryUrl(search: string, status: string): string {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status !== 'all') params.set('status', status)
  if (search) params.set('sort', 'relevance')
  const q = params.toString()
  return q ? `/library?${q}` : '/library'
}
