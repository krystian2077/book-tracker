import { describe, expect, it } from 'vitest'
import {
  CSV_RATING_REQUIRED_MSG,
  parseCsvPreview,
} from './csvPreview'

function makeFile(content: string, name = 'test.csv'): File {
  return new File([content], name, { type: 'text/csv' })
}

describe('parseCsvPreview', () => {
  it('parses valid rows and counts issues', async () => {
    const csv = [
      'title,author,isbn,pages,rating',
      'Good Book,Author,9780132350884,100,4.5',
      'Bad Book,,9780000000000,0,9',
    ].join('\n')
    const result = await parseCsvPreview(makeFile(csv))
    expect(result.fileError).toBeNull()
    expect(result.totalRows).toBe(2)
    expect(result.validRows).toBe(1)
    expect(result.invalidRows).toBe(1)
    expect(result.rows[1].issues.length).toBeGreaterThan(0)
  })

  it('reports missing columns', async () => {
    const result = await parseCsvPreview(makeFile('title,author\nA,B'))
    expect(result.fileError).toContain('Missing columns')
  })

  it('requires rating on every row', async () => {
    const csv = [
      'title,author,isbn,pages,rating',
      'Rated,Author,9780132350884,100,4.5',
      'Missing,Author,9780547928227,150,',
    ].join('\n')
    const result = await parseCsvPreview(makeFile(csv))
    expect(result.validRows).toBe(1)
    expect(result.invalidRows).toBe(1)
    expect(result.rows[1].issues).toContain(CSV_RATING_REQUIRED_MSG)
  })
})
