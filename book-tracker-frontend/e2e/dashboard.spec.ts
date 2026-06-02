import { expect, test } from '@playwright/test'
import { loginAsDemo } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
  })

  test('shows reading statistics for the demo library', async ({ page }) => {
    await expect(page.getByRole('button', { name: /total books/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^reading \d+$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^finished \d+$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /avg rating/i })).toBeVisible()
    const totalCard = page.getByRole('button', { name: /total books/i })
    await expect(totalCard).toContainText(/\d+/)
  })

  test('recently added section lists books', async ({ page }) => {
    const section = page.locator('section').filter({
      has: page.getByRole('heading', { name: /recently added/i }),
    })
    await expect(section).toBeVisible()
    await expect(section.locator('.book-card-interactive').first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
