import { expect, Page, request as pwRequest } from '@playwright/test'

export const API_BASE = process.env.E2E_API_BASE ?? 'http://127.0.0.1:18000/api/v1/'
export const DEFAULT_PASSWORD = 'password123'

const tokenCache = new Map<string, string>()

export function uniqueSuffix(prefix = 'e2e') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createApiContext(token?: string) {
  return pwRequest.newContext({
    baseURL: API_BASE,
    extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

export async function loginAndGetToken(email = 'teacher@example.com', password = DEFAULT_PASSWORD) {
  const cacheKey = `${email}:${password}`
  const cached = tokenCache.get(cacheKey)
  if (cached) return cached

  const api = await createApiContext()
  const loginRes = await api.post('auth/login', { data: { email, password } })
  expect(loginRes.ok()).toBeTruthy()
  const data = await loginRes.json()
  await api.dispose()
  tokenCache.set(cacheKey, data.access_token as string)
  return data.access_token as string
}

export async function getMe(token: string) {
  const api = await createApiContext(token)
  const res = await api.get('auth/me')
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  await api.dispose()
  return data as { id: string; name: string; email: string; role: string; school_id: string }
}

export async function ensureSemesters(token: string) {
  const api = await createApiContext(token)
  const listRes = await api.get('semesters')
  expect(listRes.ok()).toBeTruthy()
  const semesters = (await listRes.json()) as Array<{ id: string; year: number; term: number }>

  const ensure = async (year: number, term: number) => {
    const found = semesters.find((semester) => semester.year === year && semester.term === term)
    if (found) return found
    const createRes = await api.post('semesters', { data: { year, term } })
    expect(createRes.ok()).toBeTruthy()
    const created = await createRes.json()
    semesters.push(created)
    return created as { id: string; year: number; term: number }
  }

  const now = new Date()
  const current = await ensure(now.getFullYear(), 1)
  const previous = await ensure(now.getFullYear() - 1, 2)

  await api.dispose()
  return { current, previous }
}

export async function createClass(token: string, name: string, grade = 1) {
  const api = await createApiContext(token)
  const now = new Date()
  const res = await api.post('classes', {
    data: { name, grade, year: now.getFullYear() },
  })
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  await api.dispose()
  return data as { id: string; name: string; grade: number; year: number }
}

export async function addSubject(token: string, classId: string, name: string) {
  const api = await createApiContext(token)
  const res = await api.post(`classes/${classId}/subjects`, { data: { name } })
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  await api.dispose()
  return data as { id: string; class_id: string; name: string }
}

export async function createStudentAccount(
  token: string,
  input: { email: string; name: string; classId: string; studentNumber: number; birthDate?: string },
) {
  const api = await createApiContext(token)
  const res = await api.post('users/students', {
    data: {
      email: input.email,
      name: input.name,
      class_id: input.classId,
      student_number: input.studentNumber,
      birth_date: input.birthDate,
    },
  })
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  await api.dispose()
  return data as { id: string; user_id: string; class_id: string; student_number: number; name: string }
}

export async function createParentAccount(
  token: string,
  input: { email: string; name: string; studentId: string },
) {
  const api = await createApiContext(token)
  const res = await api.post('users/parents', {
    data: {
      email: input.email,
      name: input.name,
      student_id: input.studentId,
    },
  })
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  await api.dispose()
  return data as { id: string; email: string; name: string; role: string }
}

export async function createGrade(
  token: string,
  input: { studentId: string; subjectId: string; semesterId: string; score: number },
) {
  const api = await createApiContext(token)
  const res = await api.post('grades', {
    data: {
      student_id: input.studentId,
      subject_id: input.subjectId,
      semester_id: input.semesterId,
      score: input.score,
    },
  })
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  await api.dispose()
  return data as { id: string; student_id: string; subject_id: string; semester_id: string; score: number; grade_rank: number }
}

export async function loginViaUi(page: Page, email: string, password = DEFAULT_PASSWORD) {
  await page.goto('/login')
  await page.getByPlaceholder('이메일').fill(email)
  await page.getByPlaceholder('비밀번호').fill(password)
  await page.getByRole('button', { name: '로그인' }).click()
}

export async function bootstrapSession(page: Page, email: string, password = DEFAULT_PASSWORD) {
  const token = await loginAndGetToken(email, password)
  await page.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken)
    window.sessionStorage.removeItem('accessToken')
  }, token)
  await page.goto('/')
}

export async function logoutViaUi(page: Page) {
  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page).toHaveURL(/\/login/)
}

export async function seedAcademicScenario(prefix: string) {
  const token = await loginAndGetToken()
  const teacher = await getMe(token)
  const suffix = uniqueSuffix(prefix)
  const semesters = await ensureSemesters(token)
  const klass = await createClass(token, `${suffix}-1반`, 1)
  const korean = await addSubject(token, klass.id, `국어-${suffix}`)
  const math = await addSubject(token, klass.id, `수학-${suffix}`)
  const studentEmail = `${suffix}-student@example.com`
  const parentEmail = `${suffix}-parent@example.com`
  const student = await createStudentAccount(token, {
    email: studentEmail,
    name: `학생-${suffix}`,
    classId: klass.id,
    studentNumber: 1,
    birthDate: '2010-03-02',
  })
  await createParentAccount(token, {
    email: parentEmail,
    name: `학부모-${suffix}`,
    studentId: student.id,
  })

  await createGrade(token, {
    studentId: student.id,
    subjectId: korean.id,
    semesterId: semesters.previous.id,
    score: 82,
  })
  await createGrade(token, {
    studentId: student.id,
    subjectId: math.id,
    semesterId: semesters.previous.id,
    score: 74,
  })

  return {
    token,
    teacher,
    semesters,
    class: klass,
    student,
    studentEmail,
    parentEmail,
    subjects: {
      korean,
      math,
    },
  }
}
