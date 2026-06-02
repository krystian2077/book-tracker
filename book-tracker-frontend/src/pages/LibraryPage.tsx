import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBookNavigation } from '@/hooks/useBookNavigation'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { isIsbnLikeInput } from '@/lib/schemas/book'
import { PageHeader } from '@/components/layout/PageHeader'
import { LibraryList } from '@/features/library/LibraryList'
import { LibraryExport } from '@/features/library/LibraryExport'
import { SearchBar, type LibraryFilters } from '@/features/library/SearchBar'
import { useLibrary } from '@/features/library/useLibrary'

export function LibraryPage() {
  const openBook = useBookNavigation()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<LibraryFilters>(() => ({
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? 'all',
    rating: searchParams.get('rating') ?? 'all',
    sort: searchParams.get('sort') ?? 'relevance',
  }))

  const debouncedSearch = useDebouncedValue(filters.search, 300)
  const effectiveSearch =
    debouncedSearch.trim().length >= 2 || isIsbnLikeInput(debouncedSearch)
      ? debouncedSearch.trim()
      : ''

  const state = useLibrary({
    search: effectiveSearch,
    status: filters.status,
    rating: filters.rating,
    sort: filters.sort,
  })

  const isSearching = state.isFetching || filters.search !== debouncedSearch
  const hasActiveFilters =
    effectiveSearch || filters.status !== 'all' || filters.rating !== 'all'

  return (
    <div>
      <PageHeader
        title="Your library"
        description="Search, filter, export and browse every book you are tracking."
        actions={<LibraryExport />}
      />
      <SearchBar
        filters={filters}
        onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
        isSearching={isSearching}
      />
      <LibraryList
        state={state}
        onOpenBook={(ub) => openBook(ub.id)}
        emptyMessage={
          hasActiveFilters
            ? 'Try a different search or filter.'
            : 'Add your first book to start tracking your reading.'
        }
      />
    </div>
  )
}
