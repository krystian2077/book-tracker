import { isValidIsbn, normalizeIsbn } from '@/lib/schemas/book'

export const ISBN_CSV_MAX_ROWS = 5
export const ISBN_CSV_COLUMNS = ['isbn'] as const

export interface IsbnCsvRow {
  rowNumber: number
  isbn: string
  rating: string
  issues: string[]
}

export interface IsbnCsvParseResult {
  rows: IsbnCsvRow[]
  totalRows: number
  validRows: number
  invalidRows: number
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

function validateIsbnRow(row: IsbnCsvRow): string[] {
  const issues: string[] = []
  if (!row.isbn) issues.push('ISBN is required')
  else if (!isValidIsbn(row.isbn)) issues.push('Invalid ISBN')
  if (row.rating.trim()) {
    const rating = Number(row.rating)
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      issues.push('Rating must be between 0 and 5')
    }
  }
  return issues
}

export async function parseIsbnCsv(file: File): Promise<IsbnCsvParseResult> {
  const empty: IsbnCsvParseResult = {
    rows: [],
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
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
  if (!headers.includes('isbn')) {
    return { ...empty, fileError: 'Missing required column: isbn.' }
  }

  const dataLines = lines.slice(1)
  if (dataLines.length === 0) {
    return { ...empty, fileError: 'The CSV has no data rows.' }
  }
  if (dataLines.length > ISBN_CSV_MAX_ROWS) {
    return {
      ...empty,
      fileError: `Too many rows (max ${ISBN_CSV_MAX_ROWS} ISBNs per upload).`,
    }
  }

  const colIndex = Object.fromEntries(headers.map((h, i) => [h, i])) as Record<
    string,
    number
  >

  const rows: IsbnCsvRow[] = []
  let validRows = 0
  let invalidRows = 0

  for (let i = 0; i < dataLines.length; i++) {
    const cells = parseCsvLine(dataLines[i])
    const get = (col: string) => cells[colIndex[col]] ?? ''
    const row: IsbnCsvRow = {
      rowNumber: i + 2,
      isbn: normalizeIsbn(get('isbn')),
      rating: get('rating') ?? '',
      issues: [],
    }
    row.issues = validateIsbnRow(row)
    if (row.issues.length === 0) validRows++
    else invalidRows++
    rows.push(row)
  }

  return {
    rows,
    totalRows: dataLines.length,
    validRows,
    invalidRows,
    fileError: null,
  }
}
