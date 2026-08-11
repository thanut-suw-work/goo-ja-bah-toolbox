import { test, expect } from '@playwright/test'

test('defaults to dark and persists light after reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Theme: Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: 'Theme: Light' })).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('gjb-theme'))
  expect(stored).toBe('light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: 'Theme: Light' })).toBeVisible()
})
