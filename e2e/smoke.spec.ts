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

test('the worklist ranks the customers and a row opens the detail page', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./')

  await expect(page.getByRole('heading', { level: 1, name: 'Customers' })).toBeVisible()
  const rows = page.getByRole('table', { name: 'Worklist' }).locator('tbody tr')
  await expect(rows).toHaveCount(100)
  await rows.first().getByRole('link', { name: 'Customer 8797' }).click()

  await expect(page).toHaveURL(/\/customers\/8797$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Customer 8797' })).toBeVisible()
  expect(errors).toEqual([])
})

test('the overview opens from a direct deep link and a count filters the worklist', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./overview')

  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  await expect(page.getByText('ORI held by 46 of 100 customers')).toBeVisible()
  await expect(page.getByText('84 customers with AUM, 43 with the KYC note')).toBeVisible()
  await page
    .getByRole('list', { name: 'Customers per opportunity type' })
    .getByRole('link', { name: 'No ORI: 37 customers' })
    .click()

  await expect(page).toHaveURL(/\/\?rule=investment-gap-ori$/)
  await expect(page.getByRole('table', { name: 'Worklist' }).locator('tbody tr')).toHaveCount(37)
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

// Customer 6513 fires only the two BANCA rules: both cards show, never deduped.
test('the offer panel shows both BANCA cards', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./customers/6513')

  const offers = page.getByRole('region', { name: 'What to offer' }).getByRole('list', { name: 'Offers' })
  const items = offers.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('No BANCA.')
  await expect(items.nth(1)).toContainText('No BANCA.')
  expect(errors).toEqual([])
})

// Customer 1047 fires no offer rule but has the KYC note.
test('the offer panel shows the empty line and the KYC note', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./customers/1047')

  const panel = page.getByRole('region', { name: 'What to offer' })
  await expect(panel.getByText('No offer rule fired.')).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Note' })).toBeVisible()
  await expect(panel.getByText('KYC income band')).toBeVisible()
  await expect(panel.getByRole('list', { name: 'Offers' })).toHaveCount(0)
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

// jsdom cannot measure text, so the label fit is checked here. Customer 4857
// has RETAIL TRANSACTION, the longest type label, in its type mix. Recharts
// wraps a label that does not fit the axis width onto a second line.
test('the bar chart category labels fit on one line inside the chart', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./customers/4857')
  await expect(page.getByRole('img', { name: /^Type mix: .*RETAIL TRANSACTION/ })).toBeVisible()

  const labels = page.locator('[role="img"] .recharts-yAxis-tick-labels text')
  await expect(labels.filter({ hasText: 'RETAIL' })).toHaveCount(1)
  const misfits: string[] = []
  for (const label of await labels.all()) {
    const text = (await label.textContent()) ?? ''
    const box = await label.boundingBox()
    const chart = await label.locator('xpath=ancestor::*[local-name()="svg"][1]').boundingBox()
    const lines = await label.locator('tspan').count()
    if (lines !== 1 || !box || !chart || box.x < chart.x) misfits.push(`${text} (${lines} lines)`)
  }
  expect(misfits).toEqual([])
  expect(errors).toEqual([])
})

test('the overview AUM axis is labelled at each power of ten', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./overview')
  const chart = page.getByRole('img', { name: /^Income band vs AUM/ })
  await expect(chart).toBeVisible()

  const labels = chart.locator('.recharts-yAxis-tick-labels text')
  await labels.first().waitFor()
  const texts = (await labels.allTextContents()).map((text) => text.replace(/\s/g, ' '))
  expect(texts).toEqual(['Rp 10 jt', 'Rp 100 jt', 'Rp 1 M', 'Rp 10 M', 'Rp 100 M', 'Rp 1 T'])
  expect(errors).toEqual([])
})

for (const { path, chart } of [
  { path: './customers/4426', chart: /^Customer-initiated transactions per week/ },
  { path: './overview', chart: /^Income band vs AUM/ },
]) {
  test(`chart axis text follows the theme color, not the Recharts default grey (${path})`, async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(path)
    await expect(page.getByRole('img', { name: chart })).toBeVisible()
    await page.locator('[role="img"] [class*="Axis-tick-labels"] text').first().waitFor()

    // Strings, not functions: this file has no DOM types (it runs in Node).
    const muted = await page.evaluate<string>(`(() => {
      const probe = document.createElement('span')
      probe.className = 'text-muted-foreground'
      document.body.append(probe)
      const color = getComputedStyle(probe).color
      probe.remove()
      return color
    })()`)
    const fills = await page.evaluate<string[]>(
      `[...document.querySelectorAll('[role="img"] [class*="Axis-tick-labels"] text')].map((node) => getComputedStyle(node).fill)`,
    )
    expect(fills.length).toBeGreaterThan(0)
    expect(fills.filter((fill) => fill !== muted)).toEqual([])
    expect(errors).toEqual([])
  })
}
