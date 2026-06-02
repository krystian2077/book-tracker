import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui'
import { PageHeader } from '@/components/layout/PageHeader'
import { AddBookForm } from '@/features/addBook/AddBookForm'
import { IsbnLookup } from '@/features/addBook/IsbnLookup'
import { CsvImport } from '@/features/addBook/CsvImport'
import { IsbnCsvImport } from '@/features/addBook/IsbnCsvImport'

type Tab = 'manual' | 'isbn' | 'isbn-csv' | 'csv'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'manual', label: 'Add manually' },
  { id: 'isbn', label: 'Find by ISBN' },
  { id: 'isbn-csv', label: 'Import by ISBN' },
  { id: 'csv', label: 'Import CSV' },
]

export function AddBookPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('manual')

  return (
    <div className="mx-auto max-w-xl lg:max-w-2xl">
      <PageHeader
        title="Add a book"
        description="Add manually, look up by ISBN, import ISBNs from CSV, or import a full CSV."
      />

      <div
        className="tab-bar mb-5 flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm shadow-black/[0.03] dark:shadow-black/20"
        role="tablist"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-11 flex-1 touch-manipulation rounded-lg px-2 py-2.5 text-xs font-medium transition active:scale-[0.98] sm:min-h-0 sm:py-2 sm:text-sm sm:active:scale-100 ${
              tab === id
                ? 'bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-sm ring-1 ring-[var(--color-border)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="p-5 sm:p-6">
        {tab === 'manual' && <AddBookForm onSuccess={() => navigate('/library')} />}
        {tab === 'isbn' && <IsbnLookup onSuccess={() => navigate('/library')} />}
        {tab === 'isbn-csv' && <IsbnCsvImport onSuccess={() => navigate('/library')} />}
        {tab === 'csv' && <CsvImport />}
      </Card>
    </div>
  )
}
