import { Star } from 'lucide-react'

/** Format a book rating for display (always one decimal). */
export function formatBookRating(value: number): string {
  return value.toFixed(1)
}

export function RatingStars({
  value,
  size = 14,
  emptyLabel = 'Not rated',
}: {
  value: number | null | undefined
  size?: number
  emptyLabel?: string
}) {
  const numeric =
    typeof value === 'number' ? value : value != null && value !== '' ? Number(value) : null
  const rating = numeric != null && !Number.isNaN(numeric) ? numeric : 0

  if (rating <= 0) {
    return (
      <span className="text-xs italic text-[var(--color-text-muted)]">{emptyLabel}</span>
    )
  }

  const fullStars = Math.floor(rating)
  const partial = rating - fullStars

  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`Rating ${formatBookRating(rating)} out of 5`}
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          let fill = 0
          if (n <= fullStars) fill = 1
          else if (n === fullStars + 1 && partial > 0) fill = partial

          return (
            <span
              key={n}
              className="relative inline-flex shrink-0"
              style={{ width: size, height: size }}
            >
              <Star size={size} className="text-[var(--color-border)]" />
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star
                    size={size}
                    className="fill-[var(--color-warning)] text-[var(--color-warning)]"
                  />
                </span>
              )}
            </span>
          )
        })}
      </div>
      <span className="text-sm font-medium tabular-nums text-[var(--color-text)]">
        {formatBookRating(rating)}
      </span>
    </div>
  )
}
