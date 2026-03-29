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

async function createClass(apiBase: string, token: string) {
  const api = await pwRequest.newContext({ baseURL: apiBase, extraHTTPHeaders: { Authorization: `Bearer ${token}` } })
  const now = new Date()
  const res = await api.post('classes', { data: { name: '삭제데이터반', grade: 2, year: now.getFullYear() } })
  expect(res.ok()).toBeTruthy()
  const cls = await res.json()
  await api.dispose()
  return cls as { id: string }
}

async function addSubject(apiBase: string, token: string, classId: string) {
  const api = await pwRequest.newContext({ baseURL: apiBase, extraHTTPHeaders: { Authorization: `Bearer ${token}` } })
  const res = await api.post(`classes/${classId}/subjects`, { data: { name: '국어' } })
  expect(res.ok()).toBeTruthy()
  await api.dispose()
}

async function addStudent(apiBase: string, token: string, classId: string) {
  const api = await pwRequest.newContext({ baseURL: apiBase, extraHTTPHeaders: { Authorization: `Bearer ${token}` } })
  const res = await api.post(`classes/${classId}/students`, {
    data: { name: '홍길동', student_number: 1, gender: 'male' },
  })
  expect(res.ok()).toBeTruthy()
  await api.dispose()
}

test('데이터가 있는 학급도 확인 후 강제 삭제된다', async ({ page }) => {
  const apiBase = 'http://127.0.0.1:8000/api/v1/'
  const token = await loginAndGetToken(apiBase)
  const cls = await createClass(apiBase, token)
  await addSubject(apiBase, token, cls.id)
  await addStudent(apiBase, token, cls.id)

  // 로그인
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill('teacher@example.com')
  await page.getByPlaceholder('Password').fill('password123')
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  // 학생 목록 페이지 이동 및 해당 학급 선택
  await page.goto('/students')
  await expect(page.getByRole('heading', { name: '학생 목록' })).toBeVisible()
  await page.locator('select').selectOption({ value: cls.id })

  // 학생 데이터가 로드되어 Excel 버튼이 활성화되는 것을 대기 (students.length > 0)
  await expect(page.getByRole('button', { name: 'Excel로 내보내기' })).toBeEnabled()

  // 확인 다이얼로그 수락
  page.once('dialog', (d) => d.accept())

  // 삭제 요청 대기: force=true 쿼리 포함 확인
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes(`/api/v1/classes/${cls.id}`) && r.url().includes('force=true')),
    page.getByRole('button', { name: '학급 삭제' }).click(),
  ])
  // Debug info on failure
  if (!resp.ok()) {
    console.log('DELETE status', resp.status())
    console.log('DELETE url', resp.url())
    const body = await resp.text()
    console.log('DELETE body', body)
  }
  expect(resp.ok()).toBeTruthy()
})
