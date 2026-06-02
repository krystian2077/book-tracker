import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookText,
  CheckCircle2,
  FileUp,
  Loader2,
  Search,
  Upload,
} from 'lucide-react'
import { Button, Field, Input } from '@/components/ui'
import { getUserErrorMessage, normalizeApiError } from '@/lib/api/client'
import { addBookSchema, type AddBookValues } from '@/lib/schemas/book'
import { createUserBook, libraryKeys } from '@/features/library/api'
import { dashboardKeys } from '@/features/dashboard/api'
import { lookupIsbn, type IsbnLookupResult } from './lookupApi'
import { ISBN_CSV_MAX_ROWS, parseIsbnCsv, type IsbnCsvParseResult } from './isbnCsvPreview'

const SAMPLE = `isbn
9780547928227
9780132350884`

type LookupState = 'pending' | 'loading' | 'found' | 'not_found' | 'error'

export interface IsbnImportItem {
  id: string
  rowNumber: number
  isbn: string
  lookupState: LookupState
  lookupMessage: string | null
  source: string | null
  title: string
  author: string
  pages: string
  rating: string
  cover_url: string
  description: string
  published_year: string
  fieldErrors: Partial<Record<'title' | 'author' | 'pages' | 'rating' | 'isbn', string>>
}

function newItem(rowNumber: number, isbn: string, rating = ''): IsbnImportItem {
  return {
    id: `${rowNumber}-${isbn}`,
    rowNumber,
    isbn,
    lookupState: 'pending',
    lookupMessage: null,
    source: null,
    title: '',
    author: '',
    pages: '',
    rating,
    cover_url: '',
    description: '',
    published_year: '',
    fieldErrors: {},
  }
}

function applyLookup(item: IsbnImportItem, result: IsbnLookupResult): IsbnImportItem {
  return {
    ...item,
    lookupState: 'found',
    lookupMessage: null,
    source: result.source,
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

function validateItem(item: IsbnImportItem): IsbnImportItem {
  const parsed = addBookSchema.safeParse({
    title: item.title,
    author: item.author,
    isbn: item.isbn,
    pages: item.pages,
    rating: item.rating,
    status: 'want_to_read',
    current_page: 0,
    cover_url: item.cover_url,
    description: item.description,
    published_year: item.published_year,
  })
  if (parsed.success) {
    return { ...item, fieldErrors: {} }
  }
  const fieldErrors: IsbnImportItem['fieldErrors'] = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0]
    if (
      field === 'title' ||
      field === 'author' ||
      field === 'pages' ||
      field === 'rating' ||
      field === 'isbn'
    ) {
      fieldErrors[field] = issue.message
    }
  }
  return { ...item, fieldErrors }
}

function toPayload(item: IsbnImportItem): AddBookValues {
  const parsed = addBookSchema.parse({
    title: item.title,
    author: item.author,
    isbn: item.isbn,
    pages: item.pages,
    rating: item.rating,
    status: 'want_to_read',
    current_page: 0,
    cover_url: item.cover_url,
    description: item.description,
    published_year: item.published_year,
  })
  return parsed
}

function CoverPreview({ title, coverUrl }: { title: string; coverUrl: string }) {
  const [failed, setFailed] = useState(false)
  if (coverUrl && !failed) {
    return (
      <img
        src={coverUrl}
        alt={`Cover of ${title}`}
        className="h-28 w-[4.5rem] shrink-0 rounded-md object-cover"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className="flex h-28 w-[4.5rem] shrink-0 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
      <BookText size={22} />
    </div>
  )
}

function ImportBookCard({
  item,
  index,
  onChange,
}: {
  item: IsbnImportItem
  index: number
  onChange: (id: string, patch: Partial<IsbnImportItem>) => void
}) {
  const missingFields = [
    !item.title && 'title',
    !item.author && 'author',
    !item.pages && 'pages',
    !item.rating.trim() && 'rating',
  ].filter(Boolean) as string[]

  return (
    <article
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
      data-testid={`isbn-import-card-${index}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">
          Row {item.rowNumber}
        </span>
        {item.lookupState === 'found' && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
            Found{item.source ? ` · ${item.source}` : ''}
          </span>
        )}
        {item.lookupState === 'not_found' && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle size={12} />
            Not found — fill in manually
          </span>
        )}
        {item.lookupState === 'error' && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle size={12} />
            Lookup failed
          </span>
        )}
      </div>

      {item.lookupMessage && (
        <p className="mb-3 text-xs text-[var(--color-warning)]">{item.lookupMessage}</p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <CoverPreview title={item.title || 'Book'} coverUrl={item.cover_url} />
        <div className="min-w-0 flex-1 space-y-3">
          <Field label="ISBN" error={item.fieldErrors.isbn}>
            <Input
              value={item.isbn}
              readOnly
              className="font-mono text-xs"
              data-testid={`isbn-import-isbn-${index}`}
            />
          </Field>
          <Field label="Title" error={item.fieldErrors.title}>
            <Input
              value={item.title}
              onChange={(e) => onChange(item.id, { title: e.target.value })}
              placeholder="Book title"
              data-testid={`isbn-import-title-${index}`}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Author" error={item.fieldErrors.author}>
              <Input
                value={item.author}
                onChange={(e) => onChange(item.id, { author: e.target.value })}
                placeholder="Author name"
                data-testid={`isbn-import-author-${index}`}
              />
            </Field>
            <Field label="Pages" error={item.fieldErrors.pages}>
              <Input
                type="number"
                min={1}
                value={item.pages}
                onChange={(e) => onChange(item.id, { pages: e.target.value })}
                placeholder="e.g. 310"
                data-testid={`isbn-import-pages-${index}`}
              />
            </Field>
          </div>
          <Field label="Rating (0–5)" error={item.fieldErrors.rating}>
            <Input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={item.rating}
              onChange={(e) => onChange(item.id, { rating: e.target.value })}
              placeholder="e.g. 4.5"
              data-testid={`isbn-import-rating-${index}`}
            />
          </Field>
          {missingFields.length > 0 && item.lookupState === 'found' && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Some fields were not found online — please complete them before adding.
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

interface BulkSummary {
  created: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export function IsbnCsvImport({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<IsbnCsvParseResult | null>(null)
  const [parseLoading, setParseLoading] = useState(false)
  const [items, setItems] = useState<IsbnImportItem[] | null>(null)
  const [lookupProgress, setLookupProgress] = useState<string | null>(null)
  const [lookupRunning, setLookupRunning] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<BulkSummary | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const resetFlow = () => {
    setItems(null)
    setLookupProgress(null)
    setConfirmed(false)
    setSummary(null)
    setError(null)
  }

  const handleFileChange = async (next: File | null) => {
    setFile(next)
    resetFlow()
    setParseResult(null)
    if (!next) return

    setParseLoading(true)
    try {
      const result = await parseIsbnCsv(next)
      setParseResult(result)
      if (result.fileError) setError(result.fileError)
      else setError(null)
    } finally {
      setParseLoading(false)
    }
  }

  const updateItem = (id: string, patch: Partial<IsbnImportItem>) => {
    setItems((prev) =>
      prev
        ? prev.map((item) =>
            item.id === id ? validateItem({ ...item, ...patch, fieldErrors: {} }) : item,
          )
        : null,
    )
  }

  const runLookups = async () => {
    if (!parseResult || parseResult.fileError || parseResult.validRows === 0) return

    const validRows = parseResult.rows.filter((r) => r.issues.length === 0)
    const initial = validRows.map((r) => newItem(r.rowNumber, r.isbn, r.rating))
    setItems(initial)
    setLookupRunning(true)
    setError(null)
    setSummary(null)
    setConfirmed(false)

    const updated: IsbnImportItem[] = []

    for (let i = 0; i < initial.length; i++) {
      const item = initial[i]
      setLookupProgress(`Looking up ${i + 1} of ${initial.length}…`)
      setItems([...updated, { ...item, lookupState: 'loading' }])

      try {
        const result = await lookupIsbn(item.isbn)
        updated.push(applyLookup(item, result))
      } catch (err) {
        const normalized = normalizeApiError(err)
        if (normalized.status === 404) {
          updated.push({
            ...item,
            lookupState: 'not_found',
            lookupMessage:
              'No metadata found for this ISBN. Enter title, author, pages, and rating below.',
          })
        } else {
          const isbnMsg = normalized.fieldErrors.isbn
          updated.push({
            ...item,
            lookupState: 'error',
            lookupMessage:
              (Array.isArray(isbnMsg) ? isbnMsg[0] : isbnMsg) ??
              normalized.detail ??
              'Lookup failed. You can still fill in the details manually.',
          })
        }
      }
      setItems([...updated])
    }

    setLookupProgress(null)
    setLookupRunning(false)
  }

  const handleAddAll = async () => {
    if (!items?.length) return
    const validated = items.map(validateItem)
    setItems(validated)
    const hasErrors = validated.some((item) => Object.keys(item.fieldErrors).length > 0)
    if (hasErrors) {
      setError('Fix the highlighted fields on each book before adding.')
      return
    }

    setSubmitting(true)
    setError(null)
    const result: BulkSummary = { created: 0, failed: 0, errors: [] }

    for (const item of validated) {
      try {
        await createUserBook(toPayload(item))
        result.created++
      } catch (err) {
        result.failed++
        const normalized = normalizeApiError(err)
        const duplicate =
          normalized.fieldErrors.isbn &&
          String(normalized.fieldErrors.isbn).includes('already in your library')
        result.errors.push({
          row: item.rowNumber,
          message: duplicate
            ? 'Already in your library.'
            : getUserErrorMessage(err, 'Could not add this book.'),
        })
      }
    }

    setSummary(result)
    setSubmitting(false)
    if (result.created > 0) {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      if (result.failed === 0) onSuccess?.()
    }
  }

  const canLookup =
    file &&
    parseResult &&
    !parseResult.fileError &&
    parseResult.validRows > 0 &&
    !lookupRunning &&
    !items

  const canAddAll =
    items &&
    items.length > 0 &&
    !lookupRunning &&
    confirmed &&
    !submitting &&
    !summary

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">
          Upload a CSV with an <strong>isbn</strong> column (max {ISBN_CSV_MAX_ROWS} rows).
          Optional <strong>rating</strong> column pre-fills your rating. We look up each book,
          then you review and add them all at once.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs text-[var(--color-text-muted)]">
          {SAMPLE}
        </pre>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          data-testid="isbn-csv-file-input"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          <FileUp size={16} /> Choose file
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-muted)]">
          {file ? file.name : 'No file selected'}
        </span>
      </div>

      {parseLoading && (
        <p className="text-sm text-[var(--color-text-muted)]">Reading file…</p>
      )}

      {parseResult && !parseResult.fileError && !items && (
        <div
          className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
          data-testid="isbn-csv-parse-summary"
        >
          <p className="text-sm font-medium">ISBNs in file</p>
          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1">
              {parseResult.totalRows} row{parseResult.totalRows === 1 ? '' : 's'}
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
              {parseResult.validRows} valid
            </span>
            {parseResult.invalidRows > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                {parseResult.invalidRows} invalid
              </span>
            )}
          </div>
          <ul className="space-y-1 font-mono text-xs text-[var(--color-text-muted)]">
            {parseResult.rows.map((row) => (
              <li key={row.rowNumber} className={row.issues.length > 0 ? 'text-amber-600' : ''}>
                {row.isbn || '(empty)'}
                {row.issues.length > 0 && ` — ${row.issues.join(', ')}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        onClick={runLookups}
        disabled={!canLookup}
        loading={lookupRunning}
        data-testid="isbn-csv-lookup"
      >
        <Search size={16} /> Look up books
      </Button>

      {lookupProgress && (
        <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Loader2 size={16} className="animate-spin" />
          {lookupProgress}
        </p>
      )}

      {items && items.length > 0 && (
        <div className="space-y-4" data-testid="isbn-import-review">
          <p className="text-sm font-medium">Review each book</p>
          <div className="space-y-4">
            {items.map((item, index) => (
              <ImportBookCard key={item.id} item={item} index={index} onChange={updateItem} />
            ))}
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              data-testid="isbn-import-confirm"
            />
            <span>I have reviewed all books and the details are correct.</span>
          </label>

          <Button
            onClick={handleAddAll}
            disabled={!canAddAll}
            loading={submitting}
            data-testid="isbn-import-submit"
          >
            <Upload size={16} /> Add {items.length} book{items.length === 1 ? '' : 's'} to library
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {summary && (
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="text-[var(--color-success)]" size={18} />
            Import complete
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-[var(--color-success)]">Added: {summary.created}</span>
            {summary.failed > 0 && (
              <span className="text-[var(--color-danger)]">Failed: {summary.failed}</span>
            )}
          </div>
          {summary.errors.length > 0 && (
            <ul className="space-y-1 text-xs text-[var(--color-text-muted)]">
              {summary.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
