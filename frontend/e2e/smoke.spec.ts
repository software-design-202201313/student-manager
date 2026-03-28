import { test, expect } from '@playwright/test'

test('Playwright 러너 동작 스모크', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><title>Student Manager</title></head>
      <body>
        <div id="root">Hello</div>
      </body>
    </html>
  `)
  await expect(page).toHaveTitle(/Student Manager/i)
  await expect(page.locator('#root')).toHaveText('Hello')
})
