import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronRight, Plus } from 'lucide-react'
import { BookCover } from '@/components/books/BookCover'
import { Button, Card, Input, ProgressBar, RatingStars } from '@/components/ui'
import { getUserErrorMessage } from '@/lib/api/client'
import type { UserBook } from '@/lib/api/types'
import { libraryKeys, updateUserBook, type UpdateUserBookPayload } from '@/features/library/api'
import { dashboardKeys } from './api'

function ReadingCard({
  userBook,
  onOpen,
}: {
  userBook: UserBook
  onOpen?: (userBook: UserBook) => void
}) {
  const queryClient = useQueryClient()
  const { book } = userBook
  const [page, setPage] = useState<string>(String(userBook.current_page))
  const [actionError, setActionError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: UpdateUserBookPayload) => updateUserBook(userBook.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      queryClient.invalidateQueries({ queryKey: libraryKeys.all })
      setActionError(null)
    },
    onError: (error) => {
      setActionError(
        getUserErrorMessage(error, 'Could not update your progress. Please try again.'),
      )
    },
  })

  const progress = book.pages > 0 ? (userBook.current_page / book.pages) * 100 : 0
  const openDetails = () => onOpen?.(userBook)

  return (
    <Card className="reading-card-interactive group flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
      <button
        type="button"
        onClick={openDetails}
        className="reading-card-cover mx-auto shrink-0 touch-manipulation sm:mx-0"
        aria-label={`Open ${book.title}`}
      >
        <BookCover
          userBookId={userBook.id}
          coverUrl={book.cover_url}
          className="h-44 w-[7.25rem] rounded-lg shadow-md sm:h-48 sm:w-[7.75rem]"
          placeholderIconSize={32}
        />
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={openDetails}
            className="min-w-0 flex-1 touch-manipulation text-left"
          >
            <p className="reading-card-title line-clamp-2 text-center font-semibold leading-snug sm:text-left sm:truncate">
              {book.title}
            </p>
            <p className="mt-0.5 truncate text-center text-sm text-[var(--color-text-muted)] sm:text-left">
              {book.author}
            </p>
            <div className="mt-2 flex justify-center sm:justify-start">
              <RatingStars value={userBook.rating} size={14} />
            </div>
          </button>
          <button
            type="button"
            onClick={openDetails}
            className="flex min-h-11 min-w-8 shrink-0 items-center justify-center text-[var(--color-text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]"
            aria-label={`View details for ${book.title}`}
          >
            <ChevronRight size={22} />
          </button>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-xs text-[var(--color-text-muted)]">
            <span className="font-medium text-[var(--color-text)]">
              {userBook.current_page} / {book.pages} pages
            </span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button variant="ghost" className="w-full sm:w-auto" onClick={openDetails}>
            View details
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() =>
              mutation.mutate({
                current_page: Math.min(userBook.current_page + 10, book.pages),
              })
            }
            loading={mutation.isPending}
          >
            <Plus size={16} /> +10 pages
          </Button>
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:items-center sm:gap-1">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={book.pages}
              value={page}
              onChange={(e) => setPage(e.target.value)}
              className="w-full sm:w-20"
              aria-label="Set current page"
            />
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => {
                const value = Number(page)
                if (!Number.isNaN(value)) {
                  mutation.mutate({
                    current_page: Math.max(0, Math.min(value, book.pages)),
                  })
                }
              }}
            >
              Update
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-center sm:w-auto"
            onClick={() => mutation.mutate({ status: 'finished' })}
          >
            <CheckCircle2 size={16} /> Mark finished
          </Button>
        </div>
        {actionError && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {actionError}
          </p>
        )}
      </div>
    </Card>
  )
}

export function CurrentlyReading({
  reading,
  onOpenBook,
}: {
  reading: UserBook[]
  onOpenBook?: (userBook: UserBook) => void
}) {
  if (reading.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Currently reading</h2>
      <div className="flex flex-col gap-4">
        {reading.map((ub) => (
          <ReadingCard key={ub.id} userBook={ub} onOpen={onOpenBook} />
        ))}
      </div>
    </section>
  )
}
