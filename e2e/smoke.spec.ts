import { expect, test, type Page } from '@playwright/test'

// Smoke tests against the production build. Each route gets one test here,
// with a direct deep-link load. Every test fails on a page or console error.
function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

test('home page lists the customers', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./')

  await expect(page.getByRole('heading', { level: 1, name: 'Customers' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Customers' }).getByRole('link')).toHaveCount(100)
  expect(errors).toEqual([])
})

test('a customer page opens from a direct deep link', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./customers/4426')

  await expect(page.getByRole('heading', { level: 1, name: 'Customer 4426' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Key figures' })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Transactions' })).toBeVisible()
  expect(errors).toEqual([])
})

test('the search opens a customer', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./')

  await page.getByRole('combobox', { name: 'Search customer' }).click()
  await page.getByPlaceholder('Customer ID').fill('4857')
  await page.getByRole('option', { name: /Customer 4857/ }).click()

  await expect(page).toHaveURL(/\/customers\/4857$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Customer 4857' })).toBeVisible()
  await expect(page.getByText('Gender not recorded').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('the theme choice survives a reload', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./')
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  await page.reload()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible()
  expect(errors).toEqual([])
})
