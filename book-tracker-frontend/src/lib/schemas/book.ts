import { z } from 'zod'

/** Strip dashes/spaces and validate ISBN-10 / ISBN-13 checksum client-side. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase()
}

/** Loose check: input looks like an ISBN (digits/dashes), so skip min-length. */
export function isIsbnLikeInput(raw: string): boolean {
  return /^[0-9\- ]{7,}$/.test(raw.trim())
}

export function isValidIsbn(raw: string): boolean {
  const v = normalizeIsbn(raw)
  if (/^\d{9}[\dX]$/.test(v)) {
    let sum = 0
    for (let i = 0; i < 10; i++) {
      sum += (10 - i) * (v[i] === 'X' ? 10 : Number(v[i]))
    }
    return sum % 11 === 0
  }
  if (/^\d{13}$/.test(v)) {
    let sum = 0
    for (let i = 0; i < 13; i++) {
      sum += (i % 2 === 0 ? 1 : 3) * Number(v[i])
    }
    return sum % 10 === 0
  }
  return false
}

export const readingStatusEnum = z.enum([
  'want_to_read',
  'reading',
  'finished',
  'paused',
])

export const addBookSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(512),
  author: z.string().trim().min(1, 'Author is required').max(512),
  isbn: z
    .string()
    .trim()
    .min(1, 'ISBN is required')
    .refine(isValidIsbn, 'Enter a valid ISBN-10 or ISBN-13'),
  pages: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce
      .number({ message: 'Pages must be a number' })
      .int('Pages must be a whole number')
      .min(1, 'Pages must be at least 1')
      .max(100_000, 'Pages value is too large'),
  ),
  rating: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce
      .number({ message: 'Rating is required (0–5, e.g. 4 or 4.5)' })
      .min(0, 'Rating must be 0–5')
      .max(5, 'Rating must be 0–5'),
  ),
  status: readingStatusEnum.default('want_to_read'),
  current_page: z.coerce.number().int().min(0).default(0),
  cover_url: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  published_year: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.number().int().min(1).max(2100).optional(),
  ),
})

export type AddBookInput = z.input<typeof addBookSchema>
export type AddBookValues = z.output<typeof addBookSchema>
