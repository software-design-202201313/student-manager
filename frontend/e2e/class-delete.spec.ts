import { test, expect, request as pwRequest } from '@playwright/test'

async function loginAndGetToken(apiBase: string) {
  const api = await pwRequest.newContext({ baseURL: apiBase })
  const loginRes = await api.post('auth/login', {
    data: { email: 'teacher@example.com', password: 'password123' },
  })
  expect(loginRes.ok()).toBeTruthy()
  const tok = await loginRes.json()
  await api.dispose()
  return tok.access_token as string
}

async function createEmptyClass(apiBase: string, token: string) {
  const api = await pwRequest.newContext({ baseURL: apiBase, extraHTTPHeaders: { Authorization: `Bearer ${token}` } })
  const now = new Date()
  const res = await api.post('classes', { data: { name: '삭제테스트반', grade: 1, year: now.getFullYear() } })
  expect(res.ok()).toBeTruthy()
  const cls = await res.json()
  await api.dispose()
  return cls
}

test('학생 목록에서 빈 학급 삭제가 성공한다', async ({ page }) => {
  const apiBase = 'http://127.0.0.1:8000/api/v1/'
  const token = await loginAndGetToken(apiBase)
  const cls = await createEmptyClass(apiBase, token)

  // 로그인 UI 흐름
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill('teacher@example.com')
  await page.getByPlaceholder('Password').fill('password123')
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  // 학생 목록 페이지로 이동
  await page.goto('/students')
  await expect(page.getByRole('heading', { name: '학생 목록' })).toBeVisible()

  // 해당 학급 선택
  await page.locator('select').selectOption({ value: cls.id })

  // 삭제 다이얼로그 자동 승인
  page.once('dialog', (d) => d.accept())

  // 요청 감시 및 클릭
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes(`/api/v1/classes/${cls.id}`)),
    page.getByRole('button', { name: '학급 삭제' }).click(),
  ])
  expect(resp.ok()).toBeTruthy()
})
