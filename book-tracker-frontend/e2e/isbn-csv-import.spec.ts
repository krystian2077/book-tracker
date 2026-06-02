import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { goToAddBook, loginAsDemo } from './helpers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ISBN_CSV = path.join(__dirname, '../test-data/isbn-import-5-books.csv')

test.describe('ISBN CSV import (real books)', () => {
  test('uploads 5 ISBNs, looks up metadata, and adds to library', async ({ page }) => {
    test.setTimeout(120_000)

    await loginAsDemo(page)
    await goToAddBook(page)
    await page.getByRole('tab', { name: /import by isbn/i }).click()

    await page.getByTestId('isbn-csv-file-input').setInputFiles(ISBN_CSV)
    const summary = page.getByTestId('isbn-csv-parse-summary')
    await expect(summary).toBeVisible()
    await expect(summary.getByText('5 rows')).toBeVisible()
    await expect(summary.getByText('5 valid')).toBeVisible()

    await page.getByTestId('isbn-csv-lookup').click()
    await expect(page.getByTestId('isbn-import-review')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('isbn-import-card-4')).toBeVisible({ timeout: 90_000 })

    // At least one well-known title should appear from lookup
    await expect(
      page.getByTestId('isbn-import-title-0'),
    ).not.toHaveValue('', { timeout: 5_000 })

    await page.screenshot({
      path: 'test-results/isbn-import-review.png',
      fullPage: true,
    })

    // Complete any missing fields before submit (scroll — last cards may be off-screen)
    for (let i = 0; i < 5; i++) {
      const title = page.getByTestId(`isbn-import-title-${i}`)
      await title.scrollIntoViewIfNeeded()
      if ((await title.inputValue()).trim() === '') {
        await title.fill(`Manual title ${i + 1}`)
      }
      const author = page.getByTestId(`isbn-import-author-${i}`)
      if ((await author.inputValue()).trim() === '') {
        await author.fill('Unknown Author')
      }
      const pages = page.getByTestId(`isbn-import-pages-${i}`)
      await pages.scrollIntoViewIfNeeded()
      if ((await pages.inputValue()).trim() === '') {
        await pages.click()
        await pages.fill('300')
      }
      const rating = page.getByTestId(`isbn-import-rating-${i}`)
      const ratingVal = (await rating.inputValue()).replace(',', '.').trim()
      if (!ratingVal) {
        await rating.fill('4.0')
      } else if (ratingVal.includes(',')) {
        await rating.fill(ratingVal.replace(',', '.'))
      }
    }

    await page.getByTestId('isbn-import-confirm').check()
    await page.getByTestId('isbn-import-submit').click()

    await expect(
      page.getByText(/import complete/i).or(page.getByRole('heading', { name: /your library/i })),
    ).toBeVisible({ timeout: 30_000 })

    await page.screenshot({
      path: 'test-results/isbn-import-complete.png',
      fullPage: true,
    })
  })
})
