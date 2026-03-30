import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../hooks/useStudent', () => ({
  useStudent: () => ({ data: { gender: 'male' } }),
}));

vi.mock('../../hooks/useGrades', () => ({
  useGrades: (studentId: string) => ({
    data: studentId === 's1'
      ? [
          { id: 'g1', student_id: 's1', subject_id: 'sub1', semester_id: 'sem1', score: 97, grade_rank: 1 },
          { id: 'g2', student_id: 's1', subject_id: 'sub2', semester_id: 'sem1', score: 89, grade_rank: 2 },
          { id: 'g3', student_id: 's1', subject_id: 'sub3', semester_id: 'sem1', score: 78, grade_rank: 3 },
        ]
      : [],
  }),
}));

vi.mock('../../api/students', () => ({
  listAttendance: vi.fn(async () => []),
  listSpecialNotes: vi.fn(async () => []),
  createAttendance: vi.fn(),
  updateAttendance: vi.fn(),
}));

vi.mock('../../api/semesters', () => ({
  listSemesters: vi.fn(async () => [{ id: 'sem1', year: 2026, term: 1 }]),
}));

vi.mock('../../api/classes', () => ({
  listSubjects: vi.fn(async () => [
    { id: 'sub1', class_id: 'c1', name: '국어' },
    { id: 'sub2', class_id: 'c1', name: '수학' },
    { id: 'sub3', class_id: 'c1', name: '영어' },
  ]),
}));

import StudentList from '../../components/students/StudentList';

describe('StudentList', () => {
  it('shows compact grade preview for graded rows and grade-entry button otherwise, both navigating to grades page', async () => {
    const user = userEvent.setup();
    const client = new QueryClient();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/students']}>
          <Routes>
            <Route
              path="/students"
              element={(
                <StudentList
                  students={[
                    { id: 's1', user_id: 'u1', class_id: 'c1', student_number: 1, name: '김철수' },
                    { id: 's2', user_id: 'u2', class_id: 'c1', student_number: 2, name: '이영희' },
                  ]}
                />
              )}
            />
            <Route path="/grades/:studentId" element={<div>성적 페이지</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const previewButton = await screen.findByRole('button', { name: '1/2/3/' });
    expect(screen.getByRole('button', { name: '성적 입력' })).toBeInTheDocument();

    await user.click(previewButton);
    expect(await screen.findByText('성적 페이지')).toBeInTheDocument();
  });
});
