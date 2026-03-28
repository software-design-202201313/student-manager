import { test, expect, BrowserContext } from '@playwright/test'

async function stubApi(context: BrowserContext) {
  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const { pathname, searchParams } = url
    const method = route.request().method()

    // Auth
    if (pathname.endsWith('/auth/refresh') && method === 'POST') {
      return route.fulfill({ json: { access_token: 'test-token', token_type: 'bearer', role: 'teacher', user_id: 't1', name: '테스트' } })
    }
    if (pathname.endsWith('/auth/me') && method === 'GET') {
      return route.fulfill({ json: { id: 't1', email: 't@example.com', name: '홍선생', role: 'teacher', school_id: 'sch1' } })
    }

    // Student + class + semesters
    if (/\/students\/s1$/.test(pathname) && method === 'GET') {
      return route.fulfill({ json: { id: 's1', user_id: 'u1', class_id: 'c1', student_number: 1, name: '홍길동' } })
    }
    if (pathname.endsWith('/semesters') && method === 'GET') {
      return route.fulfill({ json: [{ id: 'sem1', year: 2025, term: 1 }] })
    }
    if (/\/classes\/c1\/subjects$/.test(pathname) && method === 'GET') {
      return route.fulfill({ json: [
        { id: 'sub1', name: '국어', class_id: 'c1' },
        { id: 'sub2', name: '수학', class_id: 'c1' },
      ] })
    }

    // Grades
    if (pathname.endsWith('/grades') && method === 'GET') {
      const sid = searchParams.get('student_id')
      const sem = searchParams.get('semester_id')
      if (sid === 's1' && sem === 'sem1') {
        return route.fulfill({ json: [] })
      }
    }
    if (pathname.endsWith('/grades') && method === 'POST') {
      const body = route.request().postDataJSON() as any
      return route.fulfill({ json: { id: `g-${body.subject_id}`, student_id: body.student_id, subject_id: body.subject_id, semester_id: body.semester_id, score: body.score, grade_rank: 1 } })
    }
    if (/\/grades\//.test(pathname) && method === 'PUT') {
      const body = route.request().postDataJSON() as any
      const gid = pathname.split('/').pop()
      return route.fulfill({ json: { id: gid, student_id: body.student_id, subject_id: body.subject_id, semester_id: body.semester_id, score: body.score, grade_rank: 1 } })
    }

    return route.continue()
  })
}

test.describe('성적 관리 UI', () => {
  test('저장 버튼/학기 선택/레이더 반영', async ({ page, context }) => {
    await stubApi(context)

    await page.goto('/grades/s1')
    await expect(page.getByRole('heading', { name: '성적 관리' })).toBeVisible()

    // 학기 셀렉트 존재
    const semSelect = page.getByRole('combobox')
    await expect(semSelect).toBeVisible()
    await expect(semSelect).toHaveValue('sem1')

    // 차트 탭에서 초기 경로 캡처
    await page.getByRole('button', { name: '레이더 차트' }).click()
    const chartPath = page.locator('svg path').first()
    const initialD = await chartPath.getAttribute('d')

    // 표 탭으로 이동해 점수 입력
    await page.getByRole('button', { name: '성적표' }).click()
    const firstScoreInput = page.locator('table tbody tr').nth(0).locator('input')
    await firstScoreInput.fill('95')

    // 저장 버튼 활성화 후 클릭 -> POST /grades 발생
    const saveBtn = page.getByRole('button', { name: '성적 저장' })
    await expect(saveBtn).toBeEnabled()
    const waitPost = page.waitForRequest((req) => req.url().includes('/api/v1/grades') && req.method() === 'POST')
    await saveBtn.click()
    await waitPost

    // 차트에 반영 확인 (path 변경)
    await page.getByRole('button', { name: '레이더 차트' }).click()
    await expect(chartPath).toHaveAttribute('d', /.+/)
    const newD = await chartPath.getAttribute('d')
    expect(newD).not.toBe(initialD)
  })
})

