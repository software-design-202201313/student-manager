import { test, expect, request as pwRequest } from '@playwright/test'

// Helper: seed minimal data via API (semester, class with one subject, and one student)
async function seedData(apiBase: string) {
  const api = await pwRequest.newContext({ baseURL: apiBase })

  // Login as default teacher
  const loginRes = await api.post('auth/login', {
    data: { email: 'teacher@example.com', password: 'password123' },
  })
  if (!loginRes.ok()) {
    throw new Error(`Login failed: ${loginRes.status()} ${await loginRes.text()}`)
  }
  const tok = await loginRes.json()
  const authHeaders = { Authorization: `Bearer ${tok.access_token}` }

  // Ensure at least one semester exists
  const semListRes = await api.get('semesters', { headers: authHeaders })
  expect(semListRes.ok()).toBeTruthy()
  const sems = await semListRes.json()
  if (!Array.isArray(sems) || sems.length === 0) {
    const now = new Date()
    const createSem = await api.post('semesters', {
      headers: authHeaders,
      data: { year: now.getFullYear(), term: 1 },
    })
    expect(createSem.ok()).toBeTruthy()
  }

  // Create a class
  const now = new Date()
  const clsRes = await api.post('classes', {
    headers: authHeaders,
    data: { name: '1반', grade: 1, year: now.getFullYear() },
  })
  expect(clsRes.ok()).toBeTruthy()
  const cls = await clsRes.json()

  // Add one subject (수학)
  const subjRes = await api.post(`classes/${cls.id}/subjects`, {
    headers: authHeaders,
    data: { name: '수학' },
  })
  expect(subjRes.ok()).toBeTruthy()

  // Add one student (홍길동)
  const stuRes = await api.post(`classes/${cls.id}/students`, {
    headers: authHeaders,
    data: { name: '홍길동', student_number: 1 },
  })
  expect(stuRes.ok()).toBeTruthy()
  const student = await stuRes.json()

  await api.dispose()
  const classLabel = `${now.getFullYear()}학년도 1학년 1반`
  return { studentId: student.id, classLabel }
}

test('랜딩 → 로그인 → 성적 입력 후 저장', async ({ page, baseURL }) => {
  const apiBase = 'http://127.0.0.1:8000/api/v1/'
  const { studentId, classLabel } = await seedData(apiBase)

  // 1) 랜딩 페이지 방문 후 로그인 이동
  await page.goto('/')
  await page.getByRole('button', { name: /login/i }).click()

  // 2) 로그인 수행
  await page.getByPlaceholder('Email').fill('teacher@example.com')
  await page.getByPlaceholder('Password').fill('password123')
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()

  // 3) 바로 해당 학생의 성적 페이지로 이동
  await page.goto(`/grades/${studentId}`)
  await expect(page).toHaveURL(new RegExp(`/grades/${studentId}`))
  await expect(page.getByText('성적 관리')).toBeVisible()

  // 4.5) 학기 선택이 비어있다면 첫 옵션으로 설정
  const semSelect = page.locator('select').first()
  await semSelect.waitFor()
  await semSelect.selectOption({ index: 0 })

  // 5) 성적표 테이블의 첫 입력 칸에 점수 입력 후 저장
  await expect(page.locator('table')).toBeVisible()
  const firstInput = page.locator('table input').first()
  await firstInput.waitFor()
  await firstInput.fill('95')

  // 저장 및 API 반영 대기
  const [apiResp] = await Promise.all([
    page.waitForResponse((resp) =>
      resp.url().includes('/api/v1/grades') && (resp.request().method() === 'POST' || resp.request().method() === 'PUT') && resp.ok()
    ),
    page.getByRole('button', { name: '성적 저장' }).click(),
  ])
  expect(apiResp.ok()).toBeTruthy()

  // 새로고침 후 값이 유지되는지 확인 (서버 반영 검증)
  await page.reload()
  const subjectRowAfter = page.getByRole('row', { name: /수학/ })
  await expect(subjectRowAfter.getByRole('textbox')).toHaveValue('95')
})
