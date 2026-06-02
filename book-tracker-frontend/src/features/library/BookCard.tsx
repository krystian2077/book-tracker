import type { MouseEvent } from 'react'
import { ChevronRight, Trash2 } from 'lucide-react'
import { BookCover } from '@/components/books/BookCover'
import { ProgressBar, RatingStars, StatusBadge } from '@/components/ui'
import { READING_STATUS_LABELS, type UserBook } from '@/lib/api/types'

export function BookCard({
  userBook,
  onDelete,
  onOpen,
}: {
  userBook: UserBook
  onDelete?: (id: number) => void
  onOpen?: (userBook: UserBook) => void
}) {
  const { book } = userBook
  const progress = book.pages > 0 ? (userBook.current_page / book.pages) * 100 : 0
  const progressPct = Math.round(progress)

  const handleCardClick = (e: MouseEvent) => {
    if (!onOpen) return
    if ((e.target as HTMLElement).closest('button')) return
    onOpen(userBook)
  }

  return (
    <article
      onClick={onOpen ? handleCardClick : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen(userBook)
              }
            }
          : undefined
      }
      tabIndex={onOpen ? 0 : undefined}
      role={onOpen ? 'link' : undefined}
      aria-label={onOpen ? `Open ${book.title}` : undefined}
      className={`group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm shadow-black/[0.04] dark:shadow-black/25 sm:rounded-xl ${
        onOpen ? 'book-card-interactive cursor-pointer' : ''
      }`}
    >
      <div className="flex gap-3 p-3.5 sm:gap-4 sm:p-4">
        <button
          type="button"
          onClick={() => onOpen?.(userBook)}
          className="shrink-0 touch-manipulation"
          aria-label={`Open ${book.title}`}
        >
          <BookCover
            userBookId={userBook.id}
            coverUrl={book.cover_url}
            className="h-[5.5rem] w-[3.75rem] rounded-lg shadow-sm sm:h-28 sm:w-20 sm:rounded-md"
            placeholderIconSize={28}
          />
        </button>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => onOpen?.(userBook)}
              className="min-w-0 flex-1 touch-manipulation text-left"
            >
              <h3 className="book-card-title line-clamp-2 text-[15px] font-semibold leading-snug sm:truncate sm:text-base">
                {book.title}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-sm text-[var(--color-text-muted)]">
                {book.author}
              </p>
            </button>

            <div className="flex shrink-0 items-start gap-0.5">
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(userBook.id)
                  }}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition active:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
                  aria-label={`Remove ${book.title}`}
                >
                  <Trash2 size={18} />
                </button>
              )}
              {onOpen && (
                <span
                  className="book-card-chevron hidden min-h-11 min-w-8 items-center justify-center opacity-40 sm:flex"
                  aria-hidden
                >
                  <ChevronRight size={20} />
                </span>
              )}
              <button
                type="button"
                onClick={() => onOpen?.(userBook)}
                className="book-card-chevron flex min-h-11 min-w-8 items-center justify-center text-[var(--color-text-muted)] sm:hidden"
                aria-label={`Open ${book.title}`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <RatingStars value={userBook.rating} />
            <StatusBadge
              status={userBook.status}
              label={READING_STATUS_LABELS[userBook.status]}
            />
          </div>

          <div className="mt-3 w-full">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text)]">
                {userBook.current_page} / {book.pages} pages
              </span>
              <span className="shrink-0 tabular-nums">{progressPct}%</span>
            </div>
            <ProgressBar value={progress} />
            <p className="mt-1.5 hidden truncate text-[11px] text-[var(--color-text-muted)] sm:block">
              ISBN {book.isbn_normalized}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
