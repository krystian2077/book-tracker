import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui'
import { getUserErrorMessage } from '@/lib/api/client'
import { exportLibrary } from './api'

export function LibraryExport() {
  const [loading, setLoading] = useState<'csv' | 'json' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: 'csv' | 'json') => {
    setLoading(format)
    setError(null)
    try {
      await exportLibrary(format)
    } catch (err) {
      setError(getUserErrorMessage(err, 'Export failed. Please try again.'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="!min-h-9 !py-1.5 text-xs sm:text-sm"
          loading={loading === 'csv'}
          disabled={loading !== null}
          onClick={() => handleExport('csv')}
          data-testid="export-csv"
        >
          <Download size={16} />
          Export CSV
        </Button>
        <Button
          variant="secondary"
          className="!min-h-9 !py-1.5 text-xs sm:text-sm"
          loading={loading === 'json'}
          disabled={loading !== null}
          onClick={() => handleExport('json')}
          data-testid="export-json"
        >
          <Download size={16} />
          Export JSON
        </Button>
      </div>
      {error && (
        <p role="alert" className="w-full text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}
