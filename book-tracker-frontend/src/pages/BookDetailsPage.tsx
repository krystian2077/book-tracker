import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { BookCover } from '@/components/books/BookCover'
import { Button, Card, ErrorAlert, Field, Input, ProgressBar, RatingStars, Spinner, StatusBadge } from '@/components/ui'
import { getUserErrorMessage } from '@/lib/api/client'
import { navigateWithTransition } from '@/lib/bookTransition'
import { READING_STATUS_LABELS } from '@/lib/api/types'
import { fetchUserBook, libraryKeys, updateUserBook } from '@/features/library/api'
import { dashboardKeys } from '@/features/dashboard/api'
import { NotesSection } from '@/features/notes/NotesSection'

export function BookDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userBookId = Number(id)

  const query = useQuery({
    queryKey: libraryKeys.detail(userBookId),
    queryFn: () => fetchUserBook(userBookId),
    enabled: !Number.isNaN(userBookId),
  })

  const userBook = query.data
  const [ratingInput, setRatingInput] = useState<string>('')
  const [ratingError, setRatingError] = useState<string | null>(null)

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => updateUserBook(userBookId, { rating }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.detail(userBookId) })
      queryClient.invalidateQueries({ queryKey: libraryKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      setRatingInput('')
      setRatingError(null)
    },
    onError: (error) => {
      setRatingError(
        getUserErrorMessage(error, 'Could not update the rating. Please try again.'),
      )
    },
  })

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size={28} />
      </div>
    )
  }

  if (query.isError || !userBook) {
    const message =
      query.isError && query.error
        ? getUserErrorMessage(query.error, 'Could not load this book.')
        : 'This book is not in your library.'
    return (
      <Card className="space-y-3">
        <ErrorAlert message={message} />
        <Button variant="secondary" onClick={() => navigate('/library')}>
          Back to library
        </Button>
      </Card>
    )
  }

  const { book } = userBook
  const progress = book.pages > 0 ? (userBook.current_page / book.pages) * 100 : 0
  const displayRating =
    ratingInput !== '' ? ratingInput : userBook.rating != null ? String(userBook.rating) : ''

  const handleRatingSave = () => {
    const value = Number(displayRating)
    if (Number.isNaN(value) || value < 0 || value > 5) return
    ratingMutation.mutate(value)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 lg:space-y-8">
      <Button
        variant="ghost"
        onClick={() => navigateWithTransition(() => navigate(-1))}
        className="px-0"
      >
        <ArrowLeft size={16} /> Back
      </Button>

      <Card className="flex flex-col gap-5 p-4 sm:flex-row sm:gap-6 sm:p-6 lg:gap-8 lg:p-7">
        <BookCover
          userBookId={userBookId}
          coverUrl={book.cover_url}
          className="mx-auto h-52 w-36 shrink-0 rounded-xl shadow-md sm:mx-0 sm:h-56 sm:w-40 sm:self-start sm:rounded-lg"
          placeholderIconSize={40}
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">{book.title}</h1>
          <p className="mt-1 text-[var(--color-text-muted)]">{book.author}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge
              status={userBook.status}
              label={READING_STATUS_LABELS[userBook.status]}
            />
          </div>

          <div className="mt-4 space-y-2">
            <RatingStars value={userBook.rating} size={24} />
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[8rem] flex-1">
                <Field label="Rating (0–5)">
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={displayRating}
                    onChange={(e) => setRatingInput(e.target.value)}
                    data-testid="book-details-rating"
                  />
                </Field>
              </div>
              <Button
                variant="secondary"
                onClick={handleRatingSave}
                loading={ratingMutation.isPending}
                disabled={
                  displayRating === '' ||
                  Number.isNaN(Number(displayRating)) ||
                  Number(displayRating) < 0 ||
                  Number(displayRating) > 5
                }
                data-testid="book-details-rating-save"
              >
                Update rating
              </Button>
            </div>
            {ratingError && (
              <p role="alert" className="text-sm text-[var(--color-danger)]">
                {ratingError}
              </p>
            )}
          </div>

          <div className="mt-4 w-full sm:max-w-md">
            <div className="mb-1 flex justify-between text-xs text-[var(--color-text-muted)]">
              <span>
                {userBook.current_page} / {book.pages} pages
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[var(--color-text-muted)]">ISBN</dt>
              <dd>{book.isbn_normalized}</dd>
            </div>
            {book.published_year && (
              <div>
                <dt className="text-[var(--color-text-muted)]">Published</dt>
                <dd>{book.published_year}</dd>
              </div>
            )}
          </dl>

          {book.description && (
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">
              {book.description}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <NotesSection userBookId={userBook.id} />
      </Card>
    </div>
  )
}
