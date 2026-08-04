import { test, expect } from '@playwright/test'

test('formats json', async ({ page }) => {
  await page.goto('/tools/json-formatter')
  await page.getByLabel('JSON input').fill('{"a":1}')
  await page.getByRole('button', { name: 'Format' }).click()
  await expect(page.getByLabel('JSON output')).toHaveValue(/"a": 1/)
})
