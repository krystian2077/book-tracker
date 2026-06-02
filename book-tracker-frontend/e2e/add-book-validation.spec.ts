import { expect, test } from '@playwright/test'
import { goToAddBook, loginAsDemo, uniqueIsbn13 } from './helpers'

test.describe('Add book validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
    await goToAddBook(page)
  })

  test('shows client-side error for invalid ISBN', async ({ page }) => {
    await page.getByTestId('add-book-title').fill('Bad ISBN Book')
    await page.getByTestId('add-book-author').fill('Tester')
    await page.getByTestId('add-book-isbn').fill('not-a-valid-isbn')
    await page.getByTestId('add-book-pages').fill('100')
    await page.getByTestId('add-book-rating').fill('4.5')
    await page.getByTestId('add-book-submit').click()
    await expect(page.getByText(/valid isbn/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /add a book/i })).toBeVisible()
  })

  test('shows client-side error when title is empty', async ({ page }) => {
    await page.getByTestId('add-book-author').fill('Tester')
    await page.getByTestId('add-book-isbn').fill('9780132350884')
    await page.getByTestId('add-book-pages').fill('100')
    await page.getByTestId('add-book-rating').fill('4.5')
    await page.getByTestId('add-book-submit').click()
    await expect(page.getByText(/title is required/i)).toBeVisible()
  })

  test('rejects duplicate ISBN already in the library', async ({ page }) => {
    const isbn = uniqueIsbn13()
    await page.getByTestId('add-book-title').fill('First Copy')
    await page.getByTestId('add-book-author').fill('Author')
    await page.getByTestId('add-book-isbn').fill(isbn)
    await page.getByTestId('add-book-pages').fill('464')
    await page.getByTestId('add-book-rating').fill('4.5')
    await page.getByTestId('add-book-submit').click()
    await expect(page.getByRole('heading', { name: /your library/i })).toBeVisible({
      timeout: 15_000,
    })

    await goToAddBook(page)
    await page.getByTestId('add-book-title').fill('Duplicate Copy')
    await page.getByTestId('add-book-author').fill('Author')
    await page.getByTestId('add-book-isbn').fill(isbn)
    await page.getByTestId('add-book-pages').fill('464')
    await page.getByTestId('add-book-rating').fill('4.5')
    await page.getByTestId('add-book-submit').click()
    await expect(page.getByText(/already in your library/i)).toBeVisible({
      timeout: 10_000,
    })
  })
})
