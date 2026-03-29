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
  const res = await api.post('classes', { data: { name: '피드백반', grade: 1, year: now.getFullYear() } })
  expect(res.ok()).toBeTruthy()
  const cls = await res.json()
  await api.dispose()
  return cls as { id: string }
}

async function addStudent(apiBase: string, token: string, classId: string) {
  const api = await pwRequest.newContext({ baseURL: apiBase, extraHTTPHeaders: { Authorization: `Bearer ${token}` } })
  const res = await api.post(`classes/${classId}/students`, {
    data: { name: '홍길동', student_number: 1, gender: 'male' },
  })
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  await api.dispose()
  return data as { id: string }
}

test('학급 선택 후 피드백 작성이 성공하고 최근 일자 및 내역에 반영된다', async ({ page }) => {
  const apiBase = 'http://127.0.0.1:8000/api/v1/'
  const token = await loginAndGetToken(apiBase)
  const cls = await createClass(apiBase, token)
  await addStudent(apiBase, token, cls.id)

  // 로그인 UI 흐름
  await page.goto('/login')
  await page.getByPlaceholder('Email').fill('teacher@example.com')
  await page.getByPlaceholder('Password').fill('password123')
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  // 피드백 페이지 진입
  await page.goto('/feedbacks')
  await expect(page.getByRole('heading', { name: '피드백 관리' })).toBeVisible()

  // 학급 선택 전에는 작성 버튼이 보이지 않음
  await expect(page.getByRole('button', { name: '+ 피드백 작성' })).toHaveCount(0)

  // 학급 선택
  await page.locator('select').first().selectOption({ value: cls.id })
  await expect(page.getByRole('button', { name: '+ 피드백 작성' })).toBeVisible()

  // 작성 폼 열기
  await page.getByRole('button', { name: '+ 피드백 작성' }).click()

  // 학생 선택
  await page.locator('label:has-text("학생") + div select').selectOption({ label: '1번 홍길동' })

  // 카테고리 선택 (성적)
  await page.locator('label:has-text("카테고리") + select').selectOption({ label: '성적' })

  // 내용 입력 및 저장
  const content = '자동화 테스트 피드백'
  await page.locator('textarea').fill(content)

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/api/v1/feedbacks')),
    page.getByRole('button', { name: '저장' }).click(),
  ])
  expect(resp.ok()).toBeTruthy()

  // 표에서 해당 학생 행의 최근 피드백 일자 확인 (YYYY-MM-DD)
  const row = page.locator('tr', { hasText: '홍길동' })
  await expect(row).toBeVisible()
  await expect(row.locator('td').nth(2)).toHaveText(/\d{4}-\d{2}-\d{2}/)

  // 모달로 전체 내역 확인
  await row.getByRole('button', { name: '내용 보기' }).click()
  await expect(page.getByRole('heading', { name: /피드백 내역 — 1번 홍길동/ })).toBeVisible()
  await expect(page.getByText('성적')).toBeVisible()
  await expect(page.getByText(content)).toBeVisible()
  await page.getByRole('button', { name: '닫기' }).click()
})

