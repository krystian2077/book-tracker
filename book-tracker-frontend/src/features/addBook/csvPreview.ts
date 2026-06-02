import { isValidIsbn, normalizeIsbn } from '@/lib/schemas/book'

export const CSV_COLUMNS = ['title', 'author', 'isbn', 'pages', 'rating'] as const
export const CSV_MAX_ROWS = 500
export const CSV_PREVIEW_ROWS = 8

export const CSV_RATING_REQUIRED_MSG = 'Rating is required (0–5, e.g. 4 or 4.5).'
export const CSV_RATING_INVALID_MSG = 'Rating must be between 0 and 5 (one decimal place).'

export interface CsvPreviewRow {
  rowNumber: number
  title: string
  author: string
  isbn: string
  pages: string
  rating: string
  issues: string[]
}

export interface CsvPreviewResult {
  headers: string[]
  rows: CsvPreviewRow[]
  totalRows: number
  validRows: number
  invalidRows: number
  missingColumns: string[]
  fileError: string | null
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

function validateRow(row: CsvPreviewRow): string[] {
  const issues: string[] = []
  if (!row.title) issues.push('Title is required')
  if (!row.author) issues.push('Author is required')
  if (!row.isbn) issues.push('ISBN is required')
  else if (!isValidIsbn(row.isbn)) issues.push('Invalid ISBN')
  const pages = Number(row.pages)
  if (!row.pages) issues.push('Pages is required')
  else if (!Number.isInteger(pages) || pages < 1) issues.push('Pages must be a positive integer')
  const ratingRaw = row.rating.trim()
  if (!ratingRaw) {
    issues.push(CSV_RATING_REQUIRED_MSG)
  } else {
    const rating = Number(ratingRaw)
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      issues.push(CSV_RATING_INVALID_MSG)
    }
  }
  return issues
}

export async function parseCsvPreview(file: File): Promise<CsvPreviewResult> {
  const empty: CsvPreviewResult = {
    headers: [],
    rows: [],
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    missingColumns: [],
    fileError: null,
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    return { ...empty, fileError: 'Could not read the file.' }
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    return { ...empty, fileError: 'The CSV file is empty.' }
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const missingColumns = CSV_COLUMNS.filter((col) => !headers.includes(col))
  if (missingColumns.length > 0) {
    return {
      ...empty,
      headers,
      missingColumns,
      fileError: `Missing columns: ${missingColumns.join(', ')}`,
    }
  }

  const dataLines = lines.slice(1)
  if (dataLines.length > CSV_MAX_ROWS) {
    return {
      ...empty,
      headers,
      fileError: `Too many rows (max ${CSV_MAX_ROWS}).`,
    }
  }

  const colIndex = Object.fromEntries(headers.map((h, i) => [h, i])) as Record<
    string,
    number
  >

  const rows: CsvPreviewRow[] = []
  let validRows = 0
  let invalidRows = 0

  for (let i = 0; i < dataLines.length; i++) {
    const cells = parseCsvLine(dataLines[i])
    const get = (col: string) => cells[colIndex[col]] ?? ''
    const row: CsvPreviewRow = {
      rowNumber: i + 2,
      title: get('title'),
      author: get('author'),
      isbn: normalizeIsbn(get('isbn')),
      pages: get('pages'),
      rating: get('rating'),
      issues: [],
    }
    row.issues = validateRow(row)
    if (row.issues.length === 0) validRows++
    else invalidRows++
    if (i < CSV_PREVIEW_ROWS) rows.push(row)
  }

  return {
    headers,
    rows,
    totalRows: dataLines.length,
    validRows,
    invalidRows,
    missingColumns: [],
    fileError: null,
  }
}
