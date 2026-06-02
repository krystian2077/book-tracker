import { describe, expect, it } from 'vitest'
import { addBookSchema, isValidIsbn, normalizeIsbn } from './book'

describe('isbn helpers', () => {
  it('normalizes separators and uppercases X', () => {
    expect(normalizeIsbn('978-0-547-92822-7')).toBe('9780547928227')
    expect(normalizeIsbn('080442957x')).toBe('080442957X')
  })

  it('validates ISBN-10 and ISBN-13 checksums', () => {
    expect(isValidIsbn('9780547928227')).toBe(true)
    expect(isValidIsbn('080442957X')).toBe(true)
    expect(isValidIsbn('9780547928226')).toBe(false)
    expect(isValidIsbn('not-an-isbn')).toBe(false)
  })
})

describe('addBookSchema', () => {
  const base = {
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    isbn: '978-0-547-92822-7',
    pages: '310',
    rating: '4.5',
  }

  it('accepts and coerces a valid payload', () => {
    const result = addBookSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pages).toBe(310)
      expect(result.data.rating).toBe(4.5)
      expect(result.data.status).toBe('want_to_read')
    }
  })

  it('rejects invalid isbn', () => {
    const result = addBookSchema.safeParse({ ...base, isbn: '123' })
    expect(result.success).toBe(false)
  })

  it('requires rating', () => {
    const { rating, ...withoutRating } = base
    void rating
    const result = addBookSchema.safeParse(withoutRating)
    expect(result.success).toBe(false)
  })

  it('rejects non-positive pages', () => {
    const result = addBookSchema.safeParse({ ...base, pages: '0' })
    expect(result.success).toBe(false)
  })
})
