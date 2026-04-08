import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const createStudentAccountMock = vi.fn();
const copyTextMock = vi.fn();

vi.mock('../../api/users', () => ({
  createStudentAccount: (...args: unknown[]) => createStudentAccountMock(...args),
}));

vi.mock('../../utils/clipboard', () => ({
  copyText: (...args: unknown[]) => copyTextMock(...args),
}));

import BulkInviteModal from '../../components/students/BulkInviteModal';

describe('BulkInviteModal', () => {
  beforeEach(() => {
    createStudentAccountMock.mockReset();
    copyTextMock.mockReset();
    copyTextMock.mockResolvedValue(undefined);
  });

  it('validates pasted rows and creates only valid students', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();

    createStudentAccountMock
      .mockResolvedValueOnce({ invite_url: 'http://localhost:5173/signup?token=one', id: 's1' })
      .mockResolvedValueOnce({ invite_url: 'http://localhost:5173/signup?token=two', id: 's2' });

    render(
      <QueryClientProvider client={queryClient}>
        <BulkInviteModal classId="c1" onClose={vi.fn()} />
      </QueryClientProvider>
    );

    await user.click(screen.getByRole('tab', { name: '엑셀 표 붙여넣기' }));
    fireEvent.change(screen.getByLabelText('붙여넣기 입력'), {
      target: {
        value: `이름	이메일	번호
김철수	kim@test.com	1
이영희	kim@test.com	2
박민수	park@test.com	3`,
      },
    });
    await user.click(screen.getByRole('button', { name: '검증하기' }));

    expect(await screen.findByText('유효')).toBeInTheDocument();
    expect((await screen.findAllByText('중복 이메일')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '유효한 학생만 생성' }));

    await waitFor(() => {
      expect(createStudentAccountMock).toHaveBeenCalledTimes(1);
    });
    expect(createStudentAccountMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ name: '박민수', email: 'park@test.com', student_number: 3, class_id: 'c1' }));

    expect(await screen.findByRole('button', { name: '초대 링크 일괄 복사' })).toBeInTheDocument();
  });
});
