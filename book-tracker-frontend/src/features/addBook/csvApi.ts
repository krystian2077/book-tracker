import { api } from '@/lib/api/client'

export interface ImportRowError {
  row: number
  field: string
  message: string
}

export interface ImportSummary {
  created: number
  skipped_duplicates: number
  failed: number
  errors: ImportRowError[]
}

export async function importCsv(file: File): Promise<ImportSummary> {
  const form = new FormData()
  form.append('file', file)
  // Let the browser set multipart boundary by clearing the default JSON header.
  const { data } = await api.post<ImportSummary>('/library/import-csv/', form, {
    headers: { 'Content-Type': undefined },
  })
  return data
}
