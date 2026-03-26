import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mocks must come before component import
vi.mock('../../api/students', () => ({
  getStudent: vi.fn(async () => ({ id: 's1', class_id: 'c1', name: '홍길동' })),
}));

vi.mock('../../api/semesters', () => ({
  listSemesters: vi.fn(async () => [{ id: 'sem1', year: 2025, term: 1 }]),
}));

vi.mock('../../api/classes', () => ({
  listSubjects: vi.fn(async () => [
    { id: 'sub1', name: '국어', class_id: 'c1' },
    { id: 'sub2', name: '수학', class_id: 'c1' },
  ]),
}));

vi.mock('../../hooks/useGrades', () => ({
  useGrades: () => ({ data: [] }),
  useUpsertGrade: () => ({ mutateAsync: vi.fn() }),
}));

const excelSpy = vi.fn().mockResolvedValue(undefined);
const pdfSpy = vi.fn().mockResolvedValue(undefined);
vi.mock('../../utils/exportHelpers', () => ({
  exportGradesToExcel: (...args: any[]) => excelSpy(...args),
  exportGradesToPDF: (...args: any[]) => pdfSpy(...args),
}));

import GradesPage from '../../pages/GradesPage';

describe('GradesPage', () => {
  it('triggers export helpers when buttons clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/students/s1/grades']}>
        <Routes>
          <Route path="/students/:studentId/grades" element={<GradesPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for load to finish
    await waitFor(() => expect(screen.getByText('성적 관리')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'PDF 내보내기' }));
    await user.click(screen.getByRole('button', { name: 'Excel 내보내기' }));

    expect(pdfSpy).toHaveBeenCalledTimes(1);
    expect(excelSpy).toHaveBeenCalledTimes(1);
  });
});

