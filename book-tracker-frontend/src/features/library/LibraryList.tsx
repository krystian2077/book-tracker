import { BookOpen } from 'lucide-react'
import { Button, Card, ErrorAlert, Spinner } from '@/components/ui'
import { getUserErrorMessage } from '@/lib/api/client'
import type { UserBook } from '@/lib/api/types'
import type { useLibrary } from './useLibrary'
import { BookCard } from './BookCard'

type LibraryState = ReturnType<typeof useLibrary>

function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[8.5rem] animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] sm:h-36 sm:rounded-xl"
        />
      ))}
    </div>
  )
}

export function LibraryList({
  state,
  onOpenBook,
  emptyMessage = 'Add your first book to start tracking your reading.',
}: {
  state: LibraryState
  onOpenBook?: (userBook: UserBook) => void
  emptyMessage?: string
}) {
  if (state.isLoading) return <ListSkeleton />

  if (state.isError) {
    return (
      <Card>
        <p className="text-[var(--color-danger)]">
          Could not load your library. Please try again.
        </p>
        <Button variant="secondary" className="mt-3 w-full sm:w-auto" onClick={() => state.refetch()}>
          Retry
        </Button>
      </Card>
    )
  }

  if (state.books.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-4 py-12 text-center sm:px-5">
        <BookOpen className="text-[var(--color-text-muted)]" size={36} />
        <p className="font-medium">No books found</p>
        <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{emptyMessage}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {state.deleteError && (
        <ErrorAlert
          message={getUserErrorMessage(state.deleteError, 'Could not remove this book.')}
          onRetry={state.clearDeleteError}
          retryLabel="Dismiss"
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {state.books.map((ub) => (
          <BookCard
            key={ub.id}
            userBook={ub}
            onDelete={state.deleteBook}
            onOpen={onOpenBook}
          />
        ))}
      </div>

      <div className="space-y-3 pt-1">
        {state.isFetching && (
          <div className="flex justify-center py-1">
            <Spinner />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-between">
          <Button
            variant="secondary"
            disabled={!state.hasPrev}
            onClick={state.goPrev}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={!state.hasNext}
            onClick={state.goNext}
            className="w-full sm:w-auto"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
