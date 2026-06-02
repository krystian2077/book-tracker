import { expect, test } from '@playwright/test'
import { goToAddBook, loginAsDemo } from './helpers'

test.describe('CSV import preview', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
    await goToAddBook(page)
    await page.getByRole('tab', { name: /import csv/i }).click()
  })

  test('shows preview before import is enabled', async ({ page }) => {
    const csv = [
      'title,author,isbn,pages,rating',
      'Preview Book,Author Name,9780132350884,100,4.5',
    ].join('\n')

    await page.getByTestId('csv-file-input').setInputFiles({
      name: 'preview.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    })

    await expect(page.getByTestId('csv-preview')).toBeVisible()
    await expect(page.getByText('Preview Book')).toBeVisible()
    await expect(page.getByTestId('csv-import-submit')).toBeDisabled()

    await page.getByTestId('csv-confirm').check()
    await expect(page.getByTestId('csv-import-submit')).toBeEnabled()
  })

  test('flags empty rating in preview', async ({ page }) => {
    const csv = [
      'title,author,isbn,pages,rating',
      'No Rating,Author,9780132350884,100,',
    ].join('\n')
    await page.getByTestId('csv-file-input').setInputFiles({
      name: 'no-rating.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    })
    await expect(page.getByTestId('csv-preview')).toBeVisible()
    await expect(page.getByText(/rating is required/i)).toBeVisible()
    await expect(page.getByTestId('csv-import-submit')).toBeDisabled()
  })

  test('rejects CSV with missing required columns', async ({ page }) => {
    const csv = 'title,author\nOnly,Columns'
    await page.getByTestId('csv-file-input').setInputFiles({
      name: 'bad.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    })
    await expect(page.getByRole('alert')).toContainText(/missing columns/i)
    await expect(page.getByTestId('csv-import-submit')).toBeDisabled()
  })
})
