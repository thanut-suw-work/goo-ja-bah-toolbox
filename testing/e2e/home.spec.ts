import { test, expect } from '@playwright/test'

test('home shows brand and tools', async ({ page }) => {
  await page.goto('/')
  // AppShell wraps <strong>GJB Toolbox</strong> in a link — match link role, not strong
  await expect(page.getByRole('link', { name: 'GJB Toolbox' })).toBeVisible()
  await expect(page.getByRole('link', { name: /JSON formatter/i })).toBeVisible()
})
