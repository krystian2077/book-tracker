import { useMemo, useState } from 'react'
import { BookText, Search } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Button, Field, Input } from '@/components/ui'
import { normalizeApiError } from '@/lib/api/client'
import type { AddBookInput } from '@/lib/schemas/book'
import { AddBookForm } from './AddBookForm'
import { lookupIsbn, type IsbnLookupResult } from './lookupApi'

function toInitialValues(result: IsbnLookupResult): Partial<AddBookInput> {
  return {
    title: result.title,
    author: result.author ?? '',
    isbn: result.isbn,
    pages: result.pages != null ? String(result.pages) : '',
    cover_url: result.cover_url ?? '',
    description: result.description ?? '',
    published_year:
      result.published_year != null ? String(result.published_year) : '',
  }
}

function LookupCoverPreview({ title, coverUrl }: { title: string; coverUrl: string | null }) {
  const [failed, setFailed] = useState(false)

  if (coverUrl && !failed) {
    return (
      <img
        src={coverUrl}
        alt={`Cover of ${title}`}
        className="h-24 w-16 rounded-md object-cover"
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div className="flex h-24 w-16 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
      <BookText size={20} />
    </div>
  )
}

export function IsbnLookup({ onSuccess }: { onSuccess?: () => void }) {
  const [isbn, setIsbn] = useState('')
  const [result, setResult] = useState<IsbnLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const formInitialValues = useMemo(
    () => (result ? toInitialValues(result) : undefined),
    [result],
  )

  const mutation = useMutation({
    mutationFn: lookupIsbn,
    onSuccess: (data) => {
      setResult(data)
      setError(null)
    },
    onError: (err) => {
      setResult(null)
      const normalized = normalizeApiError(err)
      if (normalized.status === 404) {
        setError(
          'No metadata found for this ISBN. Try again in a few minutes, or add the book manually below.',
        )
      } else {
        const isbnError = normalized.fieldErrors.isbn
        setError(
          (Array.isArray(isbnError) ? isbnError[0] : isbnError) ??
            normalized.detail ??
            'Lookup failed. You can still add the book manually.',
        )
      }
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="ISBN">
            <Input
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="978-0-547-92822-7"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isbn.trim()) mutation.mutate(isbn.trim())
              }}
            />
          </Field>
        </div>
        <Button
          onClick={() => isbn.trim() && mutation.mutate(isbn.trim())}
          loading={mutation.isPending}
          disabled={!isbn.trim()}
        >
          <Search size={16} /> Find book
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--color-warning)]">
          {error}
        </p>
      )}

      {result && (
        <div className="flex gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <LookupCoverPreview title={result.title} coverUrl={result.cover_url} />
          <div className="min-w-0">
            <p className="font-semibold">{result.title}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{result.author}</p>
            {result.pages != null ? (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{result.pages} pages</p>
            ) : (
              <p className="mt-1 text-sm text-[var(--color-warning)]">
                Page count not found — enter it manually below.
              </p>
            )}
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Source: {result.source}. Review the details, enter your rating, and save.
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-[var(--color-border)] pt-5">
        <AddBookForm
          key={result?.isbn ?? 'isbn-empty'}
          onSuccess={onSuccess}
          initialValues={formInitialValues}
        />
      </div>
    </div>
  )
}
