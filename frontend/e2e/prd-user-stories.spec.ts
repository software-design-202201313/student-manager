import { expect, test } from '@playwright/test'
import {
  bootstrapSession,
  createApiContext,
  DEFAULT_PASSWORD,
  loginAndGetToken,
  loginViaUi,
  logoutViaUi,
  seedAcademicScenario,
} from './helpers'

test.describe.serial('PRD user stories', () => {
  test('US-001/US-002: 교사는 성적을 입력하고 차트를 확인할 수 있다', async ({ page }) => {
    const scenario = await seedAcademicScenario('grades')

    await loginViaUi(page, 'teacher@example.com')
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto(`/grades/${scenario.student.id}`)
    await expect(page.getByRole('heading', { name: '성적 관리' })).toBeVisible()

    const scoreInputs = page.locator('table input')
    await expect(scoreInputs).toHaveCount(2)

    await scoreInputs.nth(0).fill('101')
    await expect(page.getByText('점수는 0에서 100 사이여야 합니다.')).toBeVisible()

    await scoreInputs.nth(0).fill('95')
    await scoreInputs.nth(1).fill('85')
    await expect(page.getByText('180.0')).toBeVisible()
    await expect(page.getByText('90.0')).toBeVisible()

    await scoreInputs.nth(1).fill('80')
    await expect(page.getByText('175.0')).toBeVisible()
    await expect(page.getByText('87.5')).toBeVisible()

    const saveButton = page.getByRole('button', { name: '성적 저장' })
    await expect(saveButton).toBeVisible()
    const saveResponse = page.waitForResponse((response) =>
      response.url().includes('/api/v1/grades') &&
      ['POST', 'PUT'].includes(response.request().method()) &&
      response.ok(),
    )
    await saveButton.click()
    await saveResponse

    await expect(page.locator('table tbody tr').nth(0).locator('td').nth(2)).toHaveText('2')
    await expect(page.locator('table tbody tr').nth(1).locator('td').nth(2)).toHaveText('3')

    await page.getByRole('button', { name: '레이더 차트' }).click()
    await expect(page.getByText(scenario.subjects.korean.name)).toBeVisible()
    await expect(page.getByText(scenario.subjects.math.name)).toBeVisible()
    await expect(page.getByLabel('이전 학기와 비교')).toBeEnabled()
    await page.getByLabel('이전 학기와 비교').check()
    await expect(page.getByText('이전 학기', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'PNG로 내보내기' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'PDF로 내보내기' })).toBeVisible()
  })

  test('US-004/US-005: 공개 피드백은 학생/학부모 화면과 모바일 화면에서 보인다', async ({ page }) => {
    const scenario = await seedAcademicScenario('feedback')

    await bootstrapSession(page, 'teacher@example.com')
    await page.goto('/feedbacks')
    await expect(page.getByRole('heading', { name: '피드백 관리' })).toBeVisible()

    await page.locator('select').first().selectOption({ value: scenario.class.id })
    await page.getByRole('button', { name: '+ 피드백 작성' }).click()

    await page.locator('label:has-text("학생") + div select').selectOption({ value: scenario.student.id })
    await page.locator('label:has-text("카테고리") + select').selectOption({ label: '성적' })
    await page.locator('textarea').fill('브라우저 검증용 공개 피드백')
    await page.getByLabel('학생 공개').check()
    await page.getByLabel('학부모 공개').check()

    const saveResponse = page.waitForResponse((response) =>
      response.url().includes('/api/v1/feedbacks') && response.request().method() === 'POST' && response.ok(),
    )
    await page.getByRole('button', { name: '저장' }).click()
    await saveResponse
    await expect(page.getByText('피드백이 저장되었습니다.')).toBeVisible()

    const studentApi = await createApiContext(await loginAndGetToken(scenario.studentEmail, DEFAULT_PASSWORD))
    const studentNotificationsResponse = await studentApi.get('notifications')
    expect(studentNotificationsResponse.ok()).toBeTruthy()
    const studentNotifications = await studentNotificationsResponse.json()
    expect(studentNotifications.some((item: { type: string }) => item.type === 'feedback_created')).toBe(true)
    await studentApi.dispose()

    const parentApi = await createApiContext(await loginAndGetToken(scenario.parentEmail, DEFAULT_PASSWORD))
    const parentNotificationsResponse = await parentApi.get('notifications')
    expect(parentNotificationsResponse.ok()).toBeTruthy()
    const parentNotifications = await parentNotificationsResponse.json()
    expect(parentNotifications.some((item: { type: string }) => item.type === 'feedback_created')).toBe(true)
    await parentApi.dispose()

    await logoutViaUi(page)

    await bootstrapSession(page, scenario.studentEmail, DEFAULT_PASSWORD)
    await expect(page).toHaveURL(/\/student$/)
    await expect(page.getByRole('heading', { name: '학생 대시보드' })).toBeVisible()
    await expect(page.getByText('브라우저 검증용 공개 피드백')).toBeVisible()
    await expect(page.getByText('레이더 차트')).toBeVisible()
    await logoutViaUi(page)

    await page.setViewportSize({ width: 390, height: 844 })
    await bootstrapSession(page, scenario.parentEmail, DEFAULT_PASSWORD)
    await expect(page).toHaveURL(/\/parent$/)
    await expect(page.getByRole('heading', { name: '학부모 대시보드' })).toBeVisible()
    await expect(page.getByText('브라우저 검증용 공개 피드백')).toBeVisible()
    await expect(page.getByText('레이더 차트')).toBeVisible()
  })

  test('US-006: 교사는 학생 정보를 CSV로 일괄 가져오기·내보내기 할 수 있다', async ({ page }) => {
    const scenario = await seedAcademicScenario('students')

    await bootstrapSession(page, 'teacher@example.com')
    await page.goto('/students')
    await expect(page.getByRole('heading', { name: '학생 목록' })).toBeVisible()
    await page.locator('select').first().selectOption({ value: scenario.class.id })

    await expect(page.getByRole('button', { name: 'CSV로 등록' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'CSV로 내보내기' })).toBeVisible()

    await page.getByRole('button', { name: 'CSV로 등록' }).click()
    const csv = [
      'name,student_number,birth_date,gender,phone,address',
      'CSV 학생,2,2010-04-10,male,010-1234-5678,서울',
    ].join('\n')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'students.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    })
    await page.getByRole('button', { name: '업로드' }).click()
    await expect(page.getByText('등록: 1')).toBeVisible()
    await expect(page.getByRole('button', { name: '닫기' })).toBeVisible()
    await page.getByRole('button', { name: '닫기' }).click()
    await expect(page.getByRole('button', { name: 'CSV 학생' })).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'CSV로 내보내기' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })

  test('US-003/US-007: 상담 필터와 알림 환경설정·이동이 동작한다', async ({ page }) => {
    const scenario = await seedAcademicScenario('notify')

    await bootstrapSession(page, 'teacher@example.com')
    await page.goto('/counselings')
    await expect(page.getByRole('heading', { name: '상담 기록' })).toBeVisible()

    await page.getByRole('button', { name: '+ 상담 기록 추가' }).click()
    const selects = page.locator('form select')
    await selects.nth(0).selectOption({ value: scenario.class.id })
    await selects.nth(1).selectOption({ value: scenario.student.id })
    await page.locator('input[type="date"]').first().fill('2026-03-30')
    await page.locator('textarea').nth(0).fill('브라우저 검증용 상담')
    await page.locator('textarea').nth(1).fill('다음 상담 일정 수립')
    await page.getByLabel('교사 간 공유').check()

    const counselingResponse = page.waitForResponse((response) =>
      response.url().includes('/api/v1/counselings') && response.request().method() === 'POST' && response.ok(),
    )
    await page.getByRole('button', { name: '저장' }).click()
    await counselingResponse

    await expect(page.getByLabel('학생 이름 검색')).toBeVisible()
    await expect(page.getByLabel('작성 교사')).toBeVisible()
    await expect(page.getByLabel('시작일')).toBeVisible()
    await expect(page.getByLabel('종료일')).toBeVisible()

    await page.getByLabel('작성 교사').fill(scenario.teacher.name)
    await page.getByLabel('시작일').fill('2026-03-01')
    await page.getByLabel('종료일').fill('2026-03-31')
    await expect(page.getByText('브라우저 검증용 상담').first()).toBeVisible()

    await page.goto(`/grades/${scenario.student.id}`)
    const gradeInputs = page.locator('table input')
    await gradeInputs.nth(0).fill('91')
    await gradeInputs.nth(1).fill('87')
    await page.getByRole('button', { name: '성적 저장' }).click()
    await page.waitForResponse((response) =>
      response.url().includes('/api/v1/grades') && ['POST', 'PUT'].includes(response.request().method()) && response.ok(),
    )

    await page.goto('/notifications')
    await expect(page.getByRole('heading', { name: '알림', exact: true })).toBeVisible()
    await expect(page.getByText('성적 입력 알림')).toBeVisible()
    await expect(page.getByText('피드백 알림')).toBeVisible()
    await expect(page.getByText('상담 알림')).toBeVisible()

    const gradeToggle = page.locator('#notification-grade-input')
    const preferenceResponse = page.waitForResponse((response) =>
      response.url().includes('/api/v1/notifications/preferences') && response.request().method() === 'PUT' && response.ok(),
    )
    await gradeToggle.setChecked(false)
    await expect(gradeToggle).not.toBeChecked()
    await page.getByRole('button', { name: '설정 저장' }).click()
    await preferenceResponse
    const teacherToken = await loginAndGetToken()
    const api = await createApiContext(teacherToken)
    const preferencesResponse = await api.get('notifications/preferences')
    expect(preferencesResponse.ok()).toBeTruthy()
    const savedPreferences = await preferencesResponse.json()
    expect(savedPreferences.grade_input).toBe(false)
    const beforeListResponse = await api.get('notifications')
    expect(beforeListResponse.ok()).toBeTruthy()
    const beforeNotifications = await beforeListResponse.json()
    const gradeNotificationCountBefore = beforeNotifications.filter((item: { type: string }) => item.type === 'grade_input').length

    await page.goto(`/grades/${scenario.student.id}`)
    await page.locator('table input').first().fill('93')
    await page.getByRole('button', { name: '성적 저장' }).click()
    await page.waitForResponse((response) =>
      response.url().includes('/api/v1/grades/') && response.request().method() === 'PUT' && response.ok(),
    )

    await page.goto('/notifications')
    await page.reload()
    const afterListResponse = await api.get('notifications')
    expect(afterListResponse.ok()).toBeTruthy()
    const afterNotifications = await afterListResponse.json()
    expect(afterNotifications.filter((item: { type: string }) => item.type === 'grade_input').length).toBe(gradeNotificationCountBefore)
    await api.dispose()

    const openLink = page.locator('li', { hasText: '상담 기록이 업데이트되었어요' }).getByRole('button', { name: '관련 화면으로 이동' }).first()
    await openLink.click()
    await expect.poll(() => page.url()).toContain('/counselings?studentId=')
  })
})
