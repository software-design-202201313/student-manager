import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const children = [
  { id: 'stu1', user_id: 'u1', class_id: 'class1', student_number: 1, name: '첫째' },
  { id: 'stu2', user_id: 'u2', class_id: 'class2', student_number: 2, name: '둘째' },
];

const listMyGradesMock = vi.fn(async (params?: { student_id?: string; semester_id?: string }) => {
  if (params?.student_id === 'stu2') {
    return [{ id: 'g3', student_id: 'stu2', subject_id: 'sub3', semester_id: 'sem1', score: 92, grade_rank: 2 }];
  }
  return [
    { id: 'g1', student_id: 'stu1', subject_id: 'sub1', semester_id: 'sem1', score: 95, grade_rank: 2 },
    { id: 'g2', student_id: 'stu1', subject_id: 'sub2', semester_id: 'sem1', score: 81, grade_rank: 3 },
  ];
});

const getMyGradeSummaryMock = vi.fn(async (params?: { student_id?: string; semester_id?: string }) => {
  if (params?.student_id === 'stu2') {
    return {
      total_score: 92,
      average_score: 92,
      subject_count: 1,
      grades: [{ id: 'g3', student_id: 'stu2', subject_id: 'sub3', semester_id: 'sem1', score: 92, grade_rank: 2 }],
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

const listMySubjectsMock = vi.fn(async (params?: { student_id?: string }) => {
  if (params?.student_id === 'stu2') {
    return [{ id: 'sub3', class_id: 'class2', name: '영어' }];
  }
  return [
    { id: 'sub1', class_id: 'class1', name: '국어' },
    { id: 'sub2', class_id: 'class1', name: '수학' },
  ];
});

const listMyFeedbacksMock = vi.fn(async (params?: { student_id?: string }) => {
  if (params?.student_id === 'stu2') {
    return [
      { id: 'f7', student_id: 'stu2', teacher_id: 't1', category: 'score', content: '둘째 피드백', is_visible_to_student: false, is_visible_to_parent: true, created_at: '2026-03-30T11:00:00Z' },
    ];
  }
  return [
    { id: 'f1', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '첫째 피드백 1', is_visible_to_student: false, is_visible_to_parent: true, created_at: '2026-03-30T10:00:00Z' },
    { id: 'f2', student_id: 'stu1', teacher_id: 't1', category: 'behavior', content: '첫째 피드백 2', is_visible_to_student: false, is_visible_to_parent: true, created_at: '2026-03-30T10:01:00Z' },
    { id: 'f3', student_id: 'stu1', teacher_id: 't1', category: 'attendance', content: '첫째 피드백 3', is_visible_to_student: false, is_visible_to_parent: true, created_at: '2026-03-30T10:02:00Z' },
    { id: 'f4', student_id: 'stu1', teacher_id: 't1', category: 'attitude', content: '첫째 피드백 4', is_visible_to_student: false, is_visible_to_parent: true, created_at: '2026-03-30T10:03:00Z' },
    { id: 'f5', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '첫째 피드백 5', is_visible_to_student: false, is_visible_to_parent: true, created_at: '2026-03-30T10:04:00Z' },
    { id: 'f6', student_id: 'stu1', teacher_id: 't1', category: 'score', content: '첫째 피드백 6', is_visible_to_student: false, is_visible_to_parent: true, created_at: '2026-03-30T10:05:00Z' },
  ];
});

vi.mock('../../api/semesters', () => ({
  listSemesters: vi.fn(async () => [{ id: 'sem1', year: 2026, term: 1 }]),
}));

vi.mock('../../api/my', () => ({
  getMyStudents: vi.fn(async () => children),
  listMySubjects: (...args: any[]) => listMySubjectsMock(...args),
  listMyGrades: (...args: any[]) => listMyGradesMock(...args),
  getMyGradeSummary: (...args: any[]) => getMyGradeSummaryMock(...args),
  listMyFeedbacks: (...args: any[]) => listMyFeedbacksMock(...args),
  getMyAttendanceSummary: vi.fn(async (params?: { student_id?: string }) => ({
    present: params?.student_id === 'stu2' ? 18 : 20,
    absent: 0,
    late: 1,
    early_leave: 0,
    start_date: '2026-03-01',
    end_date: '2026-03-30',
    series: [],
  })),
}));

vi.mock('../../components/grades/RadarChart', () => ({
  default: ({ grades }: { grades?: unknown[] }) => <div>{`현재 데이터 ${grades?.length ?? 0}`}</div>,
}));

import ParentHomePage from '../../pages/ParentHomePage';
import { useAuthStore } from '../../stores/authStore';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ParentHomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ParentHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'token',
      user: { id: 'p1', email: 'parent@test.com', name: '학부모', role: 'parent', school_id: 'school1' },
    });
  });

  it('shows linked child data, loads full feedbacks, and updates when child changes', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByRole('heading', { name: '학부모 대시보드' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('176.0')).toBeInTheDocument());

    expect(screen.getByText('첫째 피드백 6')).toBeInTheDocument();
    expect(listMyFeedbacksMock.mock.calls[0]).toEqual([{ student_id: 'stu1' }]);

    const [childSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(childSelect, 'stu2');

    await waitFor(() => expect(screen.getAllByText('92.0').length).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(screen.getByText('둘째 피드백')).toBeInTheDocument());
    expect(listMyFeedbacksMock.mock.calls.some((call) => JSON.stringify(call[0]) === JSON.stringify({ student_id: 'stu2' }))).toBe(true);
    expect(listMyGradesMock).toHaveBeenCalledWith({ student_id: 'stu2', semester_id: 'sem1' });
  });
});
