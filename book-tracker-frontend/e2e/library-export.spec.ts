import { expect, test } from '@playwright/test'
import { goToLibrary, loginAsDemo } from './helpers'

test.describe('Library export', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
    await goToLibrary(page)
  })

  test('export CSV returns data and triggers download', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/library/export') && r.url().includes('export_as=csv'),
    )
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('export-csv').click()
    const response = await responsePromise
    expect(response.ok(), `CSV export status ${response.status()}`).toBeTruthy()
    const body = await response.text()
    expect(body).toContain('title,author,isbn')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/library\.csv/i)
  })

  test('export JSON returns data and triggers download', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/library/export') && r.url().includes('export_as=json'),
    )
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('export-json').click()
    const response = await responsePromise
    expect(response.ok()).toBeTruthy()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/library\.json/i)
  })
})
