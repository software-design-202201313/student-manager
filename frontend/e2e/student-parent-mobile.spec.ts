import { expect, test, BrowserContext } from '@playwright/test'

async function stubStudentApi(context: BrowserContext) {
  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const { pathname, searchParams } = url
    const method = route.request().method()

    if (pathname.endsWith('/auth/refresh') && method === 'POST') {
      return route.fulfill({ json: { access_token: 'student-token', token_type: 'bearer', role: 'student', user_id: 'u1', name: '학생본인' } })
    }
    if (pathname.endsWith('/auth/me') && method === 'GET') {
      return route.fulfill({ json: { id: 'u1', email: 'student@test.com', name: '학생본인', role: 'student', school_id: 'sch1' } })
    }
    if (pathname.endsWith('/my/students') && method === 'GET') {
      return route.fulfill({ json: [{ id: 'stu1', user_id: 'u1', class_id: 'class1', student_number: 1, name: '학생본인' }] })
    }
    if (pathname.endsWith('/semesters') && method === 'GET') {
      return route.fulfill({ json: [
        { id: 'sem1', year: 2026, term: 1 },
        { id: 'sem2', year: 2025, term: 2 },
      ] })
    }
    if (pathname.endsWith('/my/subjects') && method === 'GET') {
      return route.fulfill({ json: [
        { id: 'sub1', class_id: 'class1', name: '국어' },
        { id: 'sub2', class_id: 'class1', name: '수학' },
      ] })
    }
    if (pathname.endsWith('/my/grades') && method === 'GET') {
      const semesterId = searchParams.get('semester_id')
      if (semesterId === 'sem2') {
        return route.fulfill({ json: [
          { id: 'g3', student_id: 'stu1', subject_id: 'sub1', semester_id: 'sem2', score: 89, grade_rank: 2 },
        ] })
      }
      return route.fulfill({ json: [
        { id: 'g1', student_id: 'stu1', subject_id: 'sub1', semester_id: 'sem1', score: 95, grade_rank: 2 },
        { id: 'g2', student_id: 'stu1', subject_id: 'sub2', semester_id: 'sem1', score: 81, grade_rank: 3 },
      ] })
    }
    if (pathname.endsWith('/my/grades/summary') && method === 'GET') {
      const semesterId = searchParams.get('semester_id')
      if (semesterId === 'sem2') {
        return route.fulfill({ json: { total_score: 89, average_score: 89, subject_count: 1, grades: [] } })
      }
      return route.fulfill({ json: { total_score: 176, average_score: 88, subject_count: 2, grades: [] } })
    }
    if (pathname.endsWith('/my/feedbacks') && method === 'GET') {
      return route.fulfill({ json: [
        { id: 'f1', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '피드백 1', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:00:00Z' },
        { id: 'f2', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '피드백 2', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:01:00Z' },
        { id: 'f3', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '피드백 3', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:02:00Z' },
        { id: 'f4', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '피드백 4', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:03:00Z' },
        { id: 'f5', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '피드백 5', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:04:00Z' },
        { id: 'f6', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '피드백 6', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:05:00Z' },
      ] })
    }
    if (pathname.endsWith('/my/attendance/summary') && method === 'GET') {
      return route.fulfill({ json: { present: 20, absent: 1, late: 0, early_leave: 0, start_date: '2026-03-01', end_date: '2026-03-30', series: [] } })
    }
    return route.continue()
  })
}

async function stubParentApi(context: BrowserContext) {
  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const { pathname, searchParams } = url
    const method = route.request().method()

    if (pathname.endsWith('/auth/refresh') && method === 'POST') {
      return route.fulfill({ json: { access_token: 'parent-token', token_type: 'bearer', role: 'parent', user_id: 'p1', name: '학부모' } })
    }
    if (pathname.endsWith('/auth/me') && method === 'GET') {
      return route.fulfill({ json: { id: 'p1', email: 'parent@test.com', name: '학부모', role: 'parent', school_id: 'sch1' } })
    }
    if (pathname.endsWith('/my/students') && method === 'GET') {
      return route.fulfill({ json: [
        { id: 'stu1', user_id: 'u1', class_id: 'class1', student_number: 1, name: '첫째' },
        { id: 'stu2', user_id: 'u2', class_id: 'class2', student_number: 2, name: '둘째' },
      ] })
    }
    if (pathname.endsWith('/semesters') && method === 'GET') {
      return route.fulfill({ json: [{ id: 'sem1', year: 2026, term: 1 }] })
    }
    if (pathname.endsWith('/my/subjects') && method === 'GET') {
      const studentId = searchParams.get('student_id')
      if (studentId === 'stu2') {
        return route.fulfill({ json: [{ id: 'sub2', class_id: 'class2', name: '영어' }] })
      }
      return route.fulfill({ json: [{ id: 'sub1', class_id: 'class1', name: '국어' }] })
    }
    if (pathname.endsWith('/my/grades') && method === 'GET') {
      const studentId = searchParams.get('student_id')
      if (studentId === 'stu2') {
        return route.fulfill({ json: [{ id: 'g2', student_id: 'stu2', subject_id: 'sub2', semester_id: 'sem1', score: 92, grade_rank: 2 }] })
      }
      return route.fulfill({ json: [{ id: 'g1', student_id: 'stu1', subject_id: 'sub1', semester_id: 'sem1', score: 95, grade_rank: 2 }] })
    }
    if (pathname.endsWith('/my/grades/summary') && method === 'GET') {
      const studentId = searchParams.get('student_id')
      if (studentId === 'stu2') {
        return route.fulfill({ json: { total_score: 92, average_score: 92, subject_count: 1, grades: [] } })
      }
      return route.fulfill({ json: { total_score: 95, average_score: 95, subject_count: 1, grades: [] } })
    }
    if (pathname.endsWith('/my/feedbacks') && method === 'GET') {
      const studentId = searchParams.get('student_id')
      if (studentId === 'stu2') {
        return route.fulfill({ json: [
          { id: 'f2', student_id: 'stu2', teacher_id: 't1', category: 'score', content: '둘째 피드백', is_visible_to_student: false, is_visible_to_parent: true, created_at: '2026-03-30T10:00:00Z' },
        ] })
      }
      return route.fulfill({ json: [
        { id: 'f1', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '첫째 피드백', is_visible_to_student: false, is_visible_to_parent: true, created_at: '2026-03-30T10:00:00Z' },
      ] })
    }
    if (pathname.endsWith('/my/attendance/summary') && method === 'GET') {
      const studentId = searchParams.get('student_id')
      return route.fulfill({ json: { present: studentId === 'stu2' ? 18 : 20, absent: 0, late: 1, early_leave: 0, start_date: '2026-03-01', end_date: '2026-03-30', series: [] } })
    }
    return route.continue()
  })
}

test.describe('학생/학부모 모바일 조회', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('학생이 모바일에서 학기별 성적과 공개 피드백을 조회한다', async ({ page, context }) => {
    await stubStudentApi(context)

    await page.goto('/student')
    await expect(page.getByRole('heading', { name: '학생 대시보드' })).toBeVisible()
    await expect(page.getByText('피드백 6')).toBeVisible()

    await page.getByRole('combobox').selectOption('sem2')
    await expect(page.getByText('국어 89 / 국어 89')).toBeVisible()
    await expect(page.getByText('89.0').first()).toBeVisible()
  })

  test('학부모가 모바일에서 자녀를 바꿔 같은 기능을 조회한다', async ({ page, context }) => {
    await stubParentApi(context)

    await page.goto('/parent')
    await expect(page.getByRole('heading', { name: '학부모 대시보드' })).toBeVisible()
    await expect(page.getByText('첫째 피드백')).toBeVisible()

    const selects = page.getByRole('combobox')
    await selects.nth(0).selectOption('stu2')

    await expect(page.getByText('둘째 피드백')).toBeVisible()
    await expect(page.getByText('영어 92 / 영어 92')).toBeVisible()
  })
})
