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

test('the Portfolio opens at the root and a tile filters the Customers list', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./')

  await expect(page.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeVisible()
  await expect(page.getByText('84 customers with AUM, 43 with the KYC note')).toBeVisible()
  await page.getByRole('list', { name: 'Opportunities' }).getByRole('link', { name: 'No ORI: 37 customers' }).click()

  await expect(page).toHaveURL(/\/customers\?rule=investment-gap-ori$/)
  await expect(page.getByRole('table', { name: 'Customers' }).locator('tbody tr')).toHaveCount(25)
  await expect(page.getByText('Showing 1–25 of 37')).toBeVisible()
  expect(errors).toEqual([])
})

test('the old overview link lands on the Portfolio', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./overview')

  await expect(page.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeVisible()
  await expect(page).toHaveURL(/\/customer-360\/$/)
  expect(errors).toEqual([])
})

test('the Customers list shows a page of 25 and a row opens the customer', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./customers')

  await expect(page.getByRole('heading', { level: 1, name: 'Customers' })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Customers' }).locator('tbody tr')).toHaveCount(25)
  await page.getByRole('link', { name: 'Open customer 8797' }).click()

  await expect(page).toHaveURL(/\/customers\/8797$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Customer 8797' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a letter typed in the middle of the Customers ID is dropped and the caret stays', async ({ page }) => {
  await page.goto('./customers?q=4426')
  const input = page.getByRole('textbox', { name: 'Filter by customer ID' })
  await input.click()
  await input.press('Home')
  await input.press('ArrowRight')
  await input.press('ArrowRight')
  await input.pressSequentially('a7')
  await expect(input).toHaveValue('44726')
  await expect(page).toHaveURL(/\/customers\?q=44726$/)
})

test('the preview follows a row chosen with the keyboard', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./customers')
  const preview = page.getByRole('region', { name: 'Preview' })
  await expect(preview.getByRole('heading', { name: 'Customer 8797' })).toBeVisible()

  await page.getByRole('table', { name: 'Customers' }).locator('tbody tr').nth(1).getByRole('button').focus()
  await page.keyboard.press('Enter')
  await expect(preview.getByRole('heading', { name: 'Customer 2759' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a customer page opens from a direct deep link, also on a tab', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./customers/4426')

  await expect(page.getByRole('heading', { level: 1, name: 'Customer 4426' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Key figures' })).toBeVisible()

  await page.goto('./customers/4426?tab=transactions')
  await expect(page.getByRole('table', { name: 'Transactions' })).toBeVisible()
  expect(errors).toEqual([])
})

// Customer 6513 fires only the two BANCA rules: one BANCA card lists both reasons.
test('the offers show one BANCA card with both reasons', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./customers/6513')

  const offers = page.getByRole('region', { name: 'What to offer' }).getByRole('list', { name: 'Offers' })
  const cards = offers.getByRole('listitem', { name: /^BANCA/ })
  await expect(cards).toHaveCount(1)
  await expect(cards.getByText(/^No BANCA\./)).toHaveCount(2)
  expect(errors).toEqual([])
})

// Customer 1047 fires no offer rule but has the KYC note.
test('the offers show the empty line and the KYC note', async ({ page }) => {
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

test('light is the default and the dark choice survives a reload', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./')
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
  expect(errors).toEqual([])
})

// A viewer who chose dark under ADR 0007 keeps it, applied before the first paint.
test('a stored dark choice applies before the page script runs', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
  await page.goto('./')
  const darkAtFirstPaint = await page.evaluate<boolean>(`document.documentElement.classList.contains('dark')`)
  expect(darkAtFirstPaint).toBe(true)
})

// jsdom cannot measure text, so the label fit is checked here. Customer 4857
// has RETAIL TRANSACTION, the longest type label, in its type mix. Recharts
// wraps a label that does not fit the axis width onto a second line.
test('the bar chart category labels fit on one line inside the chart', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./customers/4857?tab=activity')
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

for (const path of ['./customers/4426?tab=activity', './']) {
  test(`no chart is a keyboard stop (${path})`, async ({ page }) => {
    await page.goto(path)
    await page.locator('[role="img"] svg').first().waitFor()
    const stops = await page.evaluate<number>(`document.querySelectorAll('[role="img"] [tabindex]:not([tabindex="-1"])').length`)
    expect(stops).toBe(0)
  })
}

test('the Portfolio AUM axis is labelled at each power of ten', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('./')
  const chart = page.getByRole('img', { name: /^Income band vs AUM/ })
  await expect(chart).toBeVisible()

  const labels = chart.locator('.recharts-yAxis-tick-labels text')
  await labels.first().waitFor()
  const texts = (await labels.allTextContents()).map((text) => text.replace(/\s/g, ' '))
  expect(texts).toEqual(['Rp 10 jt', 'Rp 100 jt', 'Rp 1 M', 'Rp 10 M', 'Rp 100 M', 'Rp 1 T'])
  expect(errors).toEqual([])
})

for (const { path, chart } of [
  { path: './customers/4426?tab=activity', chart: /^Customer-initiated transactions per week/ },
  { path: './', chart: /^Income band vs AUM/ },
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

// ADR 0009: touch targets are at least 40 px. A coarse pointer (phone emulation) must get controls
// of at least 40 x 40 px. Text links inside a sentence are not controls and are not checked.
test.describe('on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  for (const path of ['./', './customers', './customers/8797', './customers/8797?tab=holdings', './customers/8797?tab=loans']) {
    test(`every control is at least 40 x 40 px (${path})`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const small = await page
        .locator('button, [role="tab"], [role="combobox"], input, a[aria-label]')
        .evaluateAll((elements) =>
          elements.flatMap((element) => {
            const box = element.getBoundingClientRect()
            if (box.width === 0 && box.height === 0) return []
            if (box.width >= 40 && box.height >= 40) return []
            const name = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.tagName
            return [`${name}: ${Math.round(box.width)}x${Math.round(box.height)}`]
          }),
        )
      expect(small).toEqual([])
    })
  }
})
