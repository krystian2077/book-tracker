import { expect, test } from '@playwright/test'
import {
  addBookViaForm,
  loginAsDemo,
  searchLibrary,
  uniqueTitle,
} from './helpers'

test.describe('Book tracker core flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
  })

  test('demo login, add book, search in library', async ({ page }) => {
    const title = uniqueTitle('E2E Flow')
    await addBookViaForm(page, { title })
    await searchLibrary(page, title)
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 })
  })

  test('theme toggle switches light and dark', async ({ page }) => {
    const toggle = page.getByRole('switch', { name: /switch to/i })
    const html = page.locator('html')
    const wasDark = await html.evaluate((el) => el.classList.contains('dark'))
    await toggle.click()
    if (wasDark) {
      await expect(html).not.toHaveClass('dark')
    } else {
      await expect(html).toHaveClass('dark')
    }
  })
})
