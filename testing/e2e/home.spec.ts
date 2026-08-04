import { test, expect } from '@playwright/test'

test('home shows brand and tools', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'GJB Toolbox' })).toBeVisible()
  await expect(page.getByRole('link', { name: /JSON formatter/i })).toBeVisible()
  await expect(
    page.getByText(
      /I built this after getting stuck on apps that only accept tax invoices as images/,
    ),
  ).toBeVisible()
})
