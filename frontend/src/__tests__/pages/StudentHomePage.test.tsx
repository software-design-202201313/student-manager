import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listSemestersMock = vi.fn(async () => [
  { id: 'sem1', year: 2026, term: 1 },
  { id: 'sem2', year: 2025, term: 2 },
]);

const listMyGradesMock = vi.fn(async (params?: { semester_id?: string }) => {
  if (params?.semester_id === 'sem2') {
    return [{ id: 'g3', student_id: 'stu1', subject_id: 'sub1', semester_id: 'sem2', score: 89, grade_rank: 2 }];
  }
  return [
    { id: 'g1', student_id: 'stu1', subject_id: 'sub1', semester_id: 'sem1', score: 95, grade_rank: 2 },
    { id: 'g2', student_id: 'stu1', subject_id: 'sub2', semester_id: 'sem1', score: 81, grade_rank: 3 },
  ];
});

const getMyGradeSummaryMock = vi.fn(async (params?: { semester_id?: string }) => {
  if (params?.semester_id === 'sem2') {
    return {
      total_score: 89,
      average_score: 89,
      subject_count: 1,
      grades: [{ id: 'g3', student_id: 'stu1', subject_id: 'sub1', semester_id: 'sem2', score: 89, grade_rank: 2 }],
    };
  }
  return {
    total_score: 176,
    average_score: 88,
    subject_count: 2,
    grades: [
      { id: 'g1', student_id: 'stu1', subject_id: 'sub1', semester_id: 'sem1', score: 95, grade_rank: 2 },
      { id: 'g2', student_id: 'stu1', subject_id: 'sub2', semester_id: 'sem1', score: 81, grade_rank: 3 },
    ],
  };
});

const listMyFeedbacksMock = vi.fn(async () => [
  { id: 'f1', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '피드백 1', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:00:00Z' },
  { id: 'f2', student_id: 'stu1', teacher_id: 't1', category: 'behavior', content: '피드백 2', is_visible_to_student: true, is_visible_to_parent: true, created_at: '2026-03-30T10:01:00Z' },
  { id: 'f3', student_id: 'stu1', teacher_id: 't1', category: 'attendance', content: '피드백 3', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:02:00Z' },
  { id: 'f4', student_id: 'stu1', teacher_id: 't1', category: 'attitude', content: '피드백 4', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:03:00Z' },
  { id: 'f5', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '피드백 5', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:04:00Z' },
  { id: 'f6', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '피드백 6', is_visible_to_student: true, is_visible_to_parent: false, created_at: '2026-03-30T10:05:00Z' },
]);

vi.mock('../../api/semesters', () => ({
  listSemesters: () => listSemestersMock(),
}));

vi.mock('../../api/my', () => ({
  getMyStudents: vi.fn(async () => [{ id: 'stu1', user_id: 'u1', class_id: 'class1', student_number: 1, name: '학생본인' }]),
  listMySubjects: vi.fn(async () => [
    { id: 'sub1', class_id: 'class1', name: '국어' },
    { id: 'sub2', class_id: 'class1', name: '수학' },
  ]),
  listMyGrades: (params?: { semester_id?: string }) => listMyGradesMock(params),
  getMyGradeSummary: (params?: { semester_id?: string }) => getMyGradeSummaryMock(params),
  listMyFeedbacks: () => listMyFeedbacksMock(),
  getMyAttendanceSummary: vi.fn(async () => ({
    present: 20,
    absent: 1,
    late: 0,
    early_leave: 0,
    start_date: '2026-03-01',
    end_date: '2026-03-30',
    series: [],
  })),
}));

vi.mock('../../components/grades/RadarChart', () => ({
  default: ({ grades, comparisonGrades }: { grades?: unknown[]; comparisonGrades?: unknown[] }) => (
    <div>
      <div>{`현재 데이터 ${grades?.length ?? 0}`}</div>
      <div>{`비교 데이터 ${comparisonGrades?.length ?? 0}`}</div>
    </div>
  ),
}));

import StudentHomePage from '../../pages/StudentHomePage';
import { useAuthStore } from '../../stores/authStore';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StudentHomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('StudentHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'token',
      user: { id: 'u1', email: 'student@test.com', name: '학생본인', role: 'student', school_id: 'school1' },
    });
  });

  it('loads semester grades, shows all feedbacks, and supports compare mode', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByRole('heading', { name: '학생 대시보드' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('176.0')).toBeInTheDocument());

    expect(screen.getByText('88.0')).toBeInTheDocument();
    expect(screen.getByText('현재 데이터 2')).toBeInTheDocument();
    expect(screen.getByText('비교 데이터 0')).toBeInTheDocument();

    await waitFor(() => expect(listMyFeedbacksMock).toHaveBeenCalled());
    expect(listMyFeedbacksMock.mock.calls[0]).toEqual([]);

    await user.click(screen.getByLabelText(/이전 학기와 비교/));
    await waitFor(() => expect(screen.getByText('비교 데이터 1')).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox'), 'sem2');
    await waitFor(() => expect(screen.getAllByText('89.0').length).toBeGreaterThanOrEqual(2));
    expect(getMyGradeSummaryMock).toHaveBeenCalledWith({ semester_id: 'sem2' });

    await user.click(screen.getByRole('button', { name: '공개된 피드백' }));
    expect(screen.getByText('피드백 6')).toBeInTheDocument();
  });
});
