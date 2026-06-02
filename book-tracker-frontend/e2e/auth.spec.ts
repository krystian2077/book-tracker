import { expect, test } from '@playwright/test'
import { loginAsDemo } from './helpers'

test.describe('Authentication', () => {
  test('shows sign-in screen for unauthenticated visitors', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /book tracker/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible()
    await expect(page.getByTestId('auth-demo-button')).toBeVisible()
  })

  test('rejects invalid credentials with an error message', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Username').fill('demo')
    await page.getByLabel('Password').fill('wrong-password-xyz')
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /welcome back/i })).not.toBeVisible()
  })

  test('logout returns to the sign-in screen', async ({ page }) => {
    await loginAsDemo(page)
    await page.getByTestId('logout-button').click()
    await expect(page.getByTestId('auth-demo-button')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /welcome back/i })).not.toBeVisible()
  })

  test('register tab shows email field', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /sign up/i }).click()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })
})
