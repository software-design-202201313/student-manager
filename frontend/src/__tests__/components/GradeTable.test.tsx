import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GradeTable from '../../components/grades/GradeTable';

describe('GradeTable', () => {
  it('shows an immediate error message for out-of-range scores', async () => {
    const user = userEvent.setup();

    render(
      <GradeTable
        subjects={[{ id: 'sub1', class_id: 'c1', name: '수학' }]}
        grades={[]}
        semesterId="sem1"
        studentId="stu1"
        onUpsert={vi.fn(async () => undefined)}
      />,
    );

    const input = screen.getByLabelText('수학 점수 입력');
    await user.type(input, '101');

    expect(screen.getByText('점수는 0에서 100 사이여야 합니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '성적 저장' })).toBeDisabled();
  });

  it('recalculates the grade immediately for valid input', async () => {
    const user = userEvent.setup();

    render(
      <GradeTable
        subjects={[{ id: 'sub1', class_id: 'c1', name: '국어' }]}
        grades={[]}
        semesterId="sem1"
        studentId="stu1"
        onUpsert={vi.fn(async () => undefined)}
      />,
    );

    const input = screen.getByLabelText('국어 점수 입력');
    await user.type(input, '95');

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('점수는 0에서 100 사이여야 합니다.')).not.toBeInTheDocument();
  });
});
