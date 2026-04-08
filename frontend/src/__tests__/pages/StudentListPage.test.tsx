import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../api/classes', () => ({
  listClasses: vi.fn(async () => [
    { id: 'c1', name: '1반', grade: 3, year: 2025, teacher_id: 't1' },
  ]),
  listSubjects: vi.fn(async () => []),
}));

vi.mock('../../api/semesters', () => ({
  listSemesters: vi.fn(async () => [{ id: 'sem1', year: 2025, term: 1 }]),
}));

vi.mock('../../hooks/useStudents', () => ({
  useStudents: () => ({
    data: [
      { id: 's1', user_id: 'u1', class_id: 'c1', name: '김철수', student_number: 1, email: 'kim@test.com', account_status: 'pending_invite', invite_status: 'pending', invite_expires_at: '2026-04-10T10:00:00', invite_sent_at: '2026-04-08T10:00:00', invite_resend_count: 0 },
      { id: 's2', user_id: 'u2', class_id: 'c1', name: '이영희', student_number: 2, email: 'lee@test.com', account_status: 'active', invite_status: 'accepted', invite_expires_at: '2026-04-10T10:00:00', invite_sent_at: '2026-04-08T10:00:00', invite_resend_count: 1 },
    ],
    isLoading: false,
  }),
}));

vi.mock('../../hooks/useStudent', () => ({
  useStudent: () => ({ data: { gender: 'male' } }),
}));

vi.mock('../../hooks/useGrades', () => ({
  useGrades: () => ({ data: [] }),
}));

vi.mock('../../api/students', () => ({
  listAttendance: vi.fn(async () => []),
  listSpecialNotes: vi.fn(async () => []),
  createAttendance: vi.fn(),
  updateAttendance: vi.fn(),
}));

const studentsExcelSpy = vi.fn().mockResolvedValue(undefined);
vi.mock('../../utils/exportHelpers', () => ({
  exportStudentsToExcel: (...args: any[]) => studentsExcelSpy(...args),
}));

import StudentListPage from '../../pages/StudentListPage';

describe('StudentListPage', () => {
  it('exports current class students to Excel', async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <StudentListPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // UI 사용 문구는 '엑셀로 내보내기'이므로 해당 레이블을 기준으로 조회
    const exportBtn = screen.getByRole('button', { name: '엑셀로 내보내기' });
    await waitFor(() => expect(exportBtn).toBeEnabled());

    await user.click(exportBtn);
    expect(studentsExcelSpy).toHaveBeenCalledTimes(1);
  });

  it('shows invitation actions and status filters when classes load', async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <StudentListPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const addBtn = await screen.findByRole('button', { name: '학생 초대' });
    const uploadBtn = await screen.findByRole('button', { name: '여러 명 초대' });
    await waitFor(() => {
      expect(addBtn).toBeEnabled();
      expect(uploadBtn).toBeEnabled();
    });

    expect(screen.getByLabelText('대기만 보기')).toBeInTheDocument();
    expect(screen.getByLabelText('7일 내 만료 예정')).toBeInTheDocument();
    expect(screen.getByText('초대 상태')).toBeInTheDocument();

    // Clicking should open modals; close buttons should appear
    await user.click(addBtn);
    expect(await screen.findByRole('heading', { name: '학생 초대' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '×' }));

    await user.click(uploadBtn);
    expect(await screen.findByRole('heading', { name: '여러 명 초대' })).toBeInTheDocument();
  });
});
