import { expect, test } from '@playwright/test'
import {
  addBookViaForm,
  goToLibrary,
  loginAsDemo,
  searchLibrary,
  uniqueTitle,
} from './helpers'

test.describe('Library filters and search', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
    await goToLibrary(page)
  })

  test('status filter shows books marked as reading', async ({ page }) => {
    const title = uniqueTitle('E2E Reading')
    await addBookViaForm(page, { title, status: 'reading' })
    await goToLibrary(page)
    await page.getByLabel('Filter by status').selectOption('reading')
    await searchLibrary(page, title)
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })
  })

  test('rated filter shows books with a rating', async ({ page }) => {
    const title = uniqueTitle('E2E Rated')
    await addBookViaForm(page, { title })
    await goToLibrary(page)
    await page.getByLabel('Filter by rating').selectOption('rated')
    await searchLibrary(page, title)
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })
  })

  test('search with no matches shows empty state', async ({ page }) => {
    await searchLibrary(page, 'zzzznonexistenttitle99999')
    await expect(page.getByText(/no books found/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/try a different search/i)).toBeVisible()
  })

  test('dashboard reading stat deep-links to filtered library', async ({ page }) => {
    await page.getByRole('link', { name: /^dashboard$/i }).first().click()
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await page.getByRole('button', { name: /^reading \d+$/i }).click()
    await expect(page).toHaveURL(/status=reading/)
    await expect(page.getByRole('heading', { name: /your library/i })).toBeVisible()
    await expect(page.getByLabel('Filter by status')).toHaveValue('reading')
  })
})
