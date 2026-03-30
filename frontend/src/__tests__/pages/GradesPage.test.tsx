import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mocks must come before component import
vi.mock('../../api/students', () => ({
  getStudent: vi.fn(async () => ({ id: 's1', class_id: 'c1', name: '홍길동' })),
}));

vi.mock('../../api/semesters', () => ({
  listSemesters: vi.fn(async () => [
    { id: 'sem1', year: 2025, term: 1 },
    { id: 'sem2', year: 2024, term: 2 },
  ]),
}));

vi.mock('../../api/classes', () => ({
  listSubjects: vi.fn(async () => [
    { id: 'sub1', name: '국어', class_id: 'c1' },
    { id: 'sub2', name: '수학', class_id: 'c1' },
  ]),
}));

const gradesBySemester: Record<string, Array<{ id: string; student_id: string; subject_id: string; semester_id: string; score: number; grade_rank: number }>> = {
  sem1: [
    { id: 'g1', student_id: 's1', subject_id: 'sub1', semester_id: 'sem1', score: 95, grade_rank: 2 },
    { id: 'g2', student_id: 's1', subject_id: 'sub2', semester_id: 'sem1', score: 85, grade_rank: 3 },
  ],
  sem2: [
    { id: 'g3', student_id: 's1', subject_id: 'sub1', semester_id: 'sem2', score: 88, grade_rank: 3 },
    { id: 'g4', student_id: 's1', subject_id: 'sub2', semester_id: 'sem2', score: 75, grade_rank: 4 },
  ],
};

vi.mock('../../hooks/useGrades', () => ({
  useGrades: (_studentId: string, semesterId?: string) => ({ data: gradesBySemester[semesterId || ''] ?? [] }),
  useUpsertGrade: () => ({ mutateAsync: vi.fn() }),
}));

const excelSpy = vi.fn().mockResolvedValue(undefined);
const pdfSpy = vi.fn().mockResolvedValue(undefined);
const pngSpy = vi.fn().mockResolvedValue(undefined);
vi.mock('../../utils/exportHelpers', () => ({
  exportGradesToExcel: (...args: any[]) => excelSpy(...args),
  exportGradesToPDF: (...args: any[]) => pdfSpy(...args),
  exportRadarChartToPNG: (...args: any[]) => pngSpy(...args),
}));

vi.mock('../../components/grades/RadarChart', () => ({
  default: ({ comparisonGrades }: { comparisonGrades?: unknown[] }) => (
    <div>
      <div>레이더 차트 목업</div>
      <div>{`비교 데이터 ${comparisonGrades?.length ?? 0}`}</div>
    </div>
  ),
}));

import GradesPage from '../../pages/GradesPage';

describe('GradesPage', () => {
  it('shows live summary, supports compare mode, and triggers export helpers', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/grades/s1']}>
        <Routes>
          <Route path="/grades/:studentId" element={<GradesPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for load to finish
    await waitFor(() => expect(screen.getByText('성적 관리')).toBeInTheDocument());
    expect(screen.getByText('180.0')).toBeInTheDocument();
    expect(screen.getByText('90.0')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'PDF 내보내기' }));
    await user.click(screen.getByRole('button', { name: 'Excel 내보내기' }));

    await user.click(screen.getByRole('button', { name: '레이더 차트' }));
    expect(screen.getByText('비교 데이터 0')).toBeInTheDocument();
    await user.click(screen.getByLabelText(/이전 학기와 비교/));
    expect(screen.getByText('비교 데이터 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'PNG로 내보내기' }));

    expect(pdfSpy).toHaveBeenCalledTimes(1);
    expect(excelSpy).toHaveBeenCalledTimes(1);
    expect(pngSpy).toHaveBeenCalledTimes(1);
  });
});
