import { expect, test } from '@playwright/test'
import { addBookViaForm, goToLibrary, loginAsDemo, searchLibrary, uniqueTitle } from './helpers'

test.describe('Library CRUD', () => {
  test('removing a book deletes it from the library list', async ({ page }) => {
    const title = uniqueTitle('E2E Delete')
    await loginAsDemo(page)
    await addBookViaForm(page, { title })
    await goToLibrary(page)
    await searchLibrary(page, title)
    await expect(page.getByText(title)).toBeVisible()

    await page.getByRole('button', { name: new RegExp(`Remove ${title}`, 'i') }).click()
    await expect(page.getByText(/no books found/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(title)).not.toBeVisible()
  })
})
