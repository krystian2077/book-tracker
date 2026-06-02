import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Eye, FileUp, Upload } from 'lucide-react'
import { Button } from '@/components/ui'
import { getUserErrorMessage } from '@/lib/api/client'
import { libraryKeys } from '@/features/library/api'
import { dashboardKeys } from '@/features/dashboard/api'
import { importCsv, type ImportSummary } from './csvApi'
import { CSV_PREVIEW_ROWS, parseCsvPreview, type CsvPreviewResult } from './csvPreview'

const SAMPLE = `title,author,isbn,pages,rating
The Hobbit,J.R.R. Tolkien,9780547928227,310,4.8
Clean Code,Robert C. Martin,9780132350884,464,4.6`

export function CsvImport() {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CsvPreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: importCsv,
    onSuccess: (data) => {
      setSummary(data)
      setError(null)
      setConfirmed(false)
      queryClient.invalidateQueries({ queryKey: libraryKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (err) => {
      setSummary(null)
      setError(getUserErrorMessage(err, 'Import failed. Please check your file and try again.'))
    },
  })

  const handleFileChange = async (next: File | null) => {
    setFile(next)
    setSummary(null)
    setError(null)
    setConfirmed(false)
    setPreview(null)
    if (!next) return

    setPreviewLoading(true)
    try {
      const result = await parseCsvPreview(next)
      setPreview(result)
      if (result.fileError) setError(result.fileError)
    } finally {
      setPreviewLoading(false)
    }
  }

  const canImport =
    file &&
    preview &&
    !preview.fileError &&
    preview.totalRows > 0 &&
    confirmed &&
    !mutation.isPending

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">
          Upload a CSV with these columns (max 500 rows). You will see a preview before
          importing. Include a <strong>rating</strong> on every row (0–5, e.g. 4 or 4.5).
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
          data-testid="csv-file-input"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          <FileUp size={16} /> Choose file
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-muted)]">
          {file ? file.name : 'No file selected'}
        </span>
      </div>

      {previewLoading && (
        <p className="text-sm text-[var(--color-text-muted)]">Parsing preview…</p>
      )}

      {preview && !preview.fileError && (
        <div
          className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
          data-testid="csv-preview"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye size={16} className="text-[var(--color-primary)]" />
            Preview
            {preview.totalRows > CSV_PREVIEW_ROWS && (
              <span className="font-normal text-[var(--color-text-muted)]">
                (first {CSV_PREVIEW_ROWS} of {preview.totalRows} rows)
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
            <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1">
              {preview.totalRows} row{preview.totalRows === 1 ? '' : 's'}
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
              {preview.validRows} valid
            </span>
            {preview.invalidRows > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                {preview.invalidRows} with issues
              </span>
            )}
          </div>

          <div className="max-h-56 overflow-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full min-w-[32rem] text-left text-xs">
              <thead className="sticky top-0 bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Author</th>
                  <th className="px-3 py-2">ISBN</th>
                  <th className="px-3 py-2">Pages</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={`border-t border-[var(--color-border)] ${
                      row.issues.length > 0 ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-[var(--color-text-muted)]">{row.rowNumber}</td>
                    <td className="max-w-[8rem] truncate px-3 py-2">{row.title || '—'}</td>
                    <td className="max-w-[8rem] truncate px-3 py-2">{row.author || '—'}</td>
                    <td className="px-3 py-2 font-mono text-[10px] sm:text-xs">{row.isbn || '—'}</td>
                    <td className="px-3 py-2">{row.pages || '—'}</td>
                    <td className="px-3 py-2">{row.rating || '—'}</td>
                    <td className="px-3 py-2">
                      {row.issues.length === 0 ? (
                        <span className="text-[var(--color-success)]">OK</span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-amber-700 dark:text-amber-300"
                          title={row.issues.join('; ')}
                        >
                          <AlertTriangle size={12} />
                          {row.issues[0]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.invalidRows > 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Rows with issues may fail during import; duplicates are skipped.
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              data-testid="csv-confirm"
            />
            <span>I have reviewed the preview and want to import these rows.</span>
          </label>
        </div>
      )}

      <Button
        onClick={() => file && mutation.mutate(file)}
        disabled={!canImport}
        loading={mutation.isPending}
        data-testid="csv-import-submit"
      >
        <Upload size={16} /> Import
      </Button>

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
            <span className="text-[var(--color-success)]">Created: {summary.created}</span>
            <span className="text-[var(--color-warning)]">
              Skipped duplicates: {summary.skipped_duplicates}
            </span>
            <span className="text-[var(--color-danger)]">Failed: {summary.failed}</span>
          </div>
          {summary.errors.length > 0 && (
            <div className="max-h-48 overflow-y-auto text-xs">
              <table className="w-full text-left">
                <thead className="text-[var(--color-text-muted)]">
                  <tr>
                    <th className="py-1 pr-4">Row</th>
                    <th className="py-1 pr-4">Field</th>
                    <th className="py-1">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.errors.map((e, i) => (
                    <tr key={i} className="border-t border-[var(--color-border)]">
                      <td className="py-1 pr-4">{e.row}</td>
                      <td className="py-1 pr-4">{e.field}</td>
                      <td className="py-1">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
