import { describe, expect, it } from 'vitest'
import { ISBN_CSV_MAX_ROWS, parseIsbnCsv } from './isbnCsvPreview'

function makeFile(content: string, name = 'isbn.csv'): File {
  return new File([content], name, { type: 'text/csv' })
}

describe('parseIsbnCsv', () => {
  it('parses valid ISBN rows', async () => {
    const csv = ['isbn', '9780132350884', '9780547928227'].join('\n')
    const result = await parseIsbnCsv(makeFile(csv))
    expect(result.fileError).toBeNull()
    expect(result.totalRows).toBe(2)
    expect(result.validRows).toBe(2)
    expect(result.rows[0].isbn).toBe('9780132350884')
  })

  it('accepts optional rating column', async () => {
    const csv = ['isbn,rating', '9780132350884,4.5'].join('\n')
    const result = await parseIsbnCsv(makeFile(csv))
    expect(result.fileError).toBeNull()
    expect(result.rows[0].rating).toBe('4.5')
  })

  it('rejects missing isbn column', async () => {
    const result = await parseIsbnCsv(makeFile('title\nBook'))
    expect(result.fileError).toContain('isbn')
  })

  it('enforces max row limit', async () => {
    const lines = ['isbn', ...Array.from({ length: ISBN_CSV_MAX_ROWS + 1 }, () => '9780132350884')]
    const result = await parseIsbnCsv(makeFile(lines.join('\n')))
    expect(result.fileError).toContain(String(ISBN_CSV_MAX_ROWS))
  })

  it('flags invalid ISBN', async () => {
    const csv = ['isbn', 'not-an-isbn'].join('\n')
    const result = await parseIsbnCsv(makeFile(csv))
    expect(result.validRows).toBe(0)
    expect(result.rows[0].issues).toContain('Invalid ISBN')
  })
})
