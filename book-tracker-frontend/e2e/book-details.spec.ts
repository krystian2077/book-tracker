import { expect, test } from '@playwright/test'
import { addBookViaForm, goToLibrary, loginAsDemo, searchLibrary, uniqueTitle } from './helpers'

test.describe('Book details', () => {
  const title = uniqueTitle('E2E Details')

  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
    await addBookViaForm(page, { title })
    await goToLibrary(page)
    await searchLibrary(page, title)
    await page.getByRole('link', { name: new RegExp(title, 'i') }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('displays book metadata on the details page', async ({ page }) => {
    await expect(page.getByText('E2E Author')).toBeVisible()
    await expect(page.getByText(/ISBN/)).toBeVisible()
    await expect(page.getByText(/pages/i)).toBeVisible()
  })

  test('shows rating section', async ({ page }) => {
    await expect(page.getByTestId('book-details-rating')).toBeVisible()
    await expect(page.getByTestId('book-details-rating-save')).toBeVisible()
  })

  test('back navigation returns to the previous page', async ({ page }) => {
    await page.getByRole('button', { name: /back/i }).click()
    await expect(page.getByRole('heading', { name: /your library/i })).toBeVisible()
  })
})
