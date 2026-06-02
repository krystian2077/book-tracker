import { useState } from 'react'
import { BookText } from 'lucide-react'
import { bookCoverTransitionName } from '@/lib/bookTransition'

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function BookCover({
  userBookId,
  coverUrl,
  className,
  placeholderIconSize = 24,
  enableTransition = true,
}: {
  userBookId: number
  coverUrl: string | null | undefined
  className?: string
  placeholderIconSize?: number
  /** Set false on placeholders where morph is not needed. */
  enableTransition?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const transitionStyle =
    enableTransition && userBookId
      ? ({ viewTransitionName: bookCoverTransitionName(userBookId) } as const)
      : undefined

  if (coverUrl && !failed) {
    return (
      <img
        src={coverUrl}
        alt=""
        style={transitionStyle}
        className={cx('book-cover-image object-cover', className)}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      style={transitionStyle}
      className={cx(
        'book-cover-image flex items-center justify-center bg-[var(--color-surface-2)] text-[var(--color-text-muted)]',
        className,
      )}
    >
      <BookText size={placeholderIconSize} />
    </div>
  )
}
