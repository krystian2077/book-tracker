import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteUserBook, fetchLibrary, libraryKeys, type LibraryQuery } from './api'
import { dashboardKeys } from '@/features/dashboard/api'

/**
 * Fetches a single keyset page of the user's library and exposes cursor
 * navigation. `keepPreviousData` keeps the current results on screen while the
 * next page or a new search loads (no flicker / layout jump).
 */
export function useLibrary(query: LibraryQuery, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  const [cursorUrl, setCursorUrl] = useState<string | null>(null)

  // Reset to the first page whenever the filters change.
  const filtersKey = JSON.stringify(query)
  const [lastFiltersKey, setLastFiltersKey] = useState(filtersKey)
  if (filtersKey !== lastFiltersKey) {
    setLastFiltersKey(filtersKey)
    setCursorUrl(null)
  }

  const listQuery = useQuery({
    queryKey: [...libraryKeys.list(query), cursorUrl],
    queryFn: () => fetchLibrary(query, cursorUrl),
    placeholderData: keepPreviousData,
    enabled: options?.enabled !== false,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUserBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })

  const deleteBook = (id: number) => {
    deleteMutation.mutate(id)
  }

  const page = listQuery.data

  return {
    books: page?.results ?? [],
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    hasNext: !!page?.next,
    hasPrev: !!page?.previous,
    goNext: () => setCursorUrl(page?.next ?? null),
    goPrev: () => setCursorUrl(page?.previous ?? null),
    deleteBook,
    deleteError: deleteMutation.isError ? deleteMutation.error : null,
    clearDeleteError: () => deleteMutation.reset(),
  }
}
