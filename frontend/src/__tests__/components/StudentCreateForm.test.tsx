import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const createStudentAccountMock = vi.fn();
const createParentAccountMock = vi.fn();
const copyTextMock = vi.fn();

vi.mock('../../api/users', () => ({
  createStudentAccount: (...args: unknown[]) => createStudentAccountMock(...args),
  createParentAccount: (...args: unknown[]) => createParentAccountMock(...args),
}));

vi.mock('../../utils/clipboard', () => ({
  copyText: (...args: unknown[]) => copyTextMock(...args),
}));

import StudentCreateForm from '../../components/students/StudentCreateForm';

describe('StudentCreateForm', () => {
  beforeEach(() => {
    createStudentAccountMock.mockReset();
    createParentAccountMock.mockReset();
    copyTextMock.mockReset();
    copyTextMock.mockResolvedValue(undefined);
  });

  it('shows success actions and copies invitation data', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    createStudentAccountMock.mockResolvedValue({
      id: 's1',
      user_id: 'u1',
      class_id: 'c1',
      student_number: 7,
      name: '김철수',
      email: 'kim@test.com',
      account_status: 'pending_invite',
      invite_url: 'http://localhost:5173/signup?token=abc123',
      invite_status: 'pending',
      invite_expires_at: '2026-04-10T10:00:00',
      invite_sent_at: '2026-04-08T10:00:00',
      invite_resend_count: 0,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <StudentCreateForm classId="c1" nextStudentNumber={7} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    await user.type(screen.getByLabelText('학생 이름'), '김철수');
    await user.type(screen.getByLabelText('학생 이메일'), 'kim@test.com');
    await user.click(screen.getByRole('button', { name: '초대 생성' }));

    expect(await screen.findByRole('button', { name: '링크 복사' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'QR 보기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카카오/문자 공유용 텍스트 복사' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '링크 복사' }));
    await waitFor(() => {
      expect(copyTextMock).toHaveBeenCalledWith('http://localhost:5173/signup?token=abc123');
    });

    await user.click(screen.getByRole('button', { name: '카카오/문자 공유용 텍스트 복사' }));
    await waitFor(() => {
      expect(copyTextMock).toHaveBeenCalledWith(expect.stringContaining('김철수'));
      expect(copyTextMock).toHaveBeenCalledWith(expect.stringContaining('http://localhost:5173/signup?token=abc123'));
    });
  });
});
