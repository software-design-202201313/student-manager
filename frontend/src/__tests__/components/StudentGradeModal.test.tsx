import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../api/semesters', () => ({
  listSemesters: vi.fn(async () => [{ id: 'sem1', year: 2026, term: 1 }]),
}));

vi.mock('../../api/students', () => ({
  getStudent: vi.fn(async () => ({
    id: 's1', user_id: 'u1', class_id: 'c1', student_number: 1, name: '김철수',
    birth_date: null, gender: 'male', phone: null, address: null,
  })),
}));

vi.mock('../../api/classes', () => ({
  listSubjects: vi.fn(async () => [{ id: 'sub1', class_id: 'c1', name: '국어' }]),
}));

const mutateAsyncSpy = vi.fn(async () => ({}));
vi.mock('../../hooks/useGrades', async (orig) => {
  const mod = await orig();
  return {
    ...mod,
    useGrades: () => ({ data: [] }),
    useUpsertGrade: () => ({ mutateAsync: mutateAsyncSpy }),
  };
});

import StudentGradeModal from '../../components/students/StudentGradeModal';

describe('StudentGradeModal', () => {
  it('loads semesters, subjects, allows entering a score and saving', async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <StudentGradeModal studentId="s1" studentName="김철수" onClose={() => {}} />
      </QueryClientProvider>
    );

    // Wait for table to render with the subject
    await screen.findByText('국어');

    // There should be one score input; type a valid score
    const table = screen.getByRole('table');
    const input = within(table).getByRole('textbox');
    fireEvent.change(input, { target: { value: '90' } });

    // Button becomes enabled and footer summary reflects total/average
    const saveBtn = screen.getByRole('button', { name: '성적 저장' });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    await waitFor(() => {
      expect(screen.getByText(/총점: 90/)).toBeInTheDocument();
      expect(screen.getAllByText(/평균: 90/).length).toBeGreaterThan(0);
    });

    // Click "성적 저장" in the table, which should call mutateAsync with payload
    await user.click(saveBtn);
    await waitFor(() => expect(mutateAsyncSpy).toHaveBeenCalled());
  });
});
