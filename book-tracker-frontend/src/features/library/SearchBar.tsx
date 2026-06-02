import { Search } from 'lucide-react'
import { Input, Select, Spinner } from '@/components/ui'
import { READING_STATUS_LABELS, type ReadingStatus } from '@/lib/api/types'

export interface LibraryFilters {
  search: string
  status: string
  rating: string
  sort: string
}

const STATUS_OPTIONS = Object.entries(READING_STATUS_LABELS) as Array<
  [ReadingStatus, string]
>

export function SearchBar({
  filters,
  onChange,
  isSearching,
}: {
  filters: LibraryFilters
  onChange: (next: Partial<LibraryFilters>) => void
  isSearching?: boolean
}) {
  return (
    <div className="filter-panel mb-5 space-y-3 sm:mb-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          size={18}
        />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search title, author or ISBN…"
          className="pl-10"
          aria-label="Search library"
          enterKeyHint="search"
          data-testid="library-search"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner size={18} />
          </div>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-3 lg:grid-cols-3">
        <Select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
          aria-label="Filter by status"
          className="min-w-[9.5rem] shrink-0 sm:min-w-0"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          value={filters.rating}
          onChange={(e) => onChange({ rating: e.target.value })}
          aria-label="Filter by rating"
          className="min-w-[9.5rem] shrink-0 sm:min-w-0"
        >
          <option value="all">All ratings</option>
          <option value="unrated">Not rated</option>
          <option value="rated">Rated</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={String(r)}>
              {r} star{r > 1 ? 's' : ''}
            </option>
          ))}
        </Select>

        <Select
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value })}
          aria-label="Sort by"
          className="min-w-[9.5rem] shrink-0 sm:min-w-0"
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="rating">Rating</option>
          <option value="progress">Progress</option>
          <option value="pages">Most pages</option>
        </Select>
      </div>
    </div>
  )
}
