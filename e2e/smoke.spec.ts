import { expect, test } from '@playwright/test'

// Smoke test against the production build. Each route gets one test here;
// features that add routes also add a direct deep-link load.
test('home page renders with no page or console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('./')

  await expect(page.getByRole('heading', { name: 'Customer 360' })).toBeVisible()
  expect(errors).toEqual([])
})
