import { expect, type Page } from '@playwright/test'

/** Valid ISBN-13 unlikely to collide with seeded demo data. */
export function uniqueIsbn13(): string {
  const core = `978${String(Date.now()).slice(-9)}`.padEnd(12, '0').slice(0, 12)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += (i % 2 === 0 ? 1 : 3) * Number(core[i])
  }
  const check = (10 - (sum % 10)) % 10
  return core + String(check)
}

export function uniqueTitle(prefix = 'E2E'): string {
  return `${prefix} ${Date.now()}`
}

export async function loginAsDemo(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByTestId('auth-demo-button').click()
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({
    timeout: 15_000,
  })
}

export async function goToLibrary(page: Page): Promise<void> {
  await page.getByRole('link', { name: /^library$/i }).first().click()
  await expect(page.getByRole('heading', { name: /your library/i })).toBeVisible({
    timeout: 10_000,
  })
}

export async function goToAddBook(page: Page): Promise<void> {
  await page.getByRole('link', { name: /add/i }).first().click()
  await expect(page.getByRole('heading', { name: /add a book/i })).toBeVisible()
}

export interface AddBookOptions {
  title: string
  author?: string
  isbn?: string
  pages?: string
  rating?: string
  status?: string
}

/** Fill the manual add form and submit; expects redirect to library. */
export async function addBookViaForm(page: Page, opts: AddBookOptions): Promise<void> {
  await goToAddBook(page)
  await page.getByTestId('add-book-title').fill(opts.title)
  await page.getByTestId('add-book-author').fill(opts.author ?? 'E2E Author')
  await page.getByTestId('add-book-isbn').fill(opts.isbn ?? uniqueIsbn13())
  await page.getByTestId('add-book-pages').fill(opts.pages ?? '200')
  await page.getByTestId('add-book-rating').fill(opts.rating ?? '4.5')
  if (opts.status) {
    await page.getByTestId('add-book-status').selectOption(opts.status)
  }
  await page.getByTestId('add-book-submit').click()
  await expect(page.getByRole('heading', { name: /your library/i })).toBeVisible({
    timeout: 15_000,
  })
}

export async function searchLibrary(page: Page, query: string): Promise<void> {
  await page.getByTestId('library-search').fill(query)
}
