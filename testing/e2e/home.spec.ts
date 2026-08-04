import { test, expect } from '@playwright/test'

test('home shows brand and tools', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'GJB Toolbox' })).toBeVisible()
  await expect(page.getByRole('link', { name: /JSON formatter/i })).toBeVisible()
})
