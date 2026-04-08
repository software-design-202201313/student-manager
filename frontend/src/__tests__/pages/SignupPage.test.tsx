import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const getInvitationMock = vi.fn();
const acceptInvitationMock = vi.fn();
const getMeMock = vi.fn();

vi.mock('../../api/auth', () => ({
  getInvitation: (...args: unknown[]) => getInvitationMock(...args),
  acceptInvitation: (...args: unknown[]) => acceptInvitationMock(...args),
  getMe: (...args: unknown[]) => getMeMock(...args),
}));

import SignupPage from '../../pages/SignupPage';

describe('SignupPage', () => {
  beforeEach(() => {
    getInvitationMock.mockReset();
    acceptInvitationMock.mockReset();
    getMeMock.mockReset();
    window.history.replaceState({}, '', '/signup?token=test-token');
  });

  it('shows invitation details and live password guidance', async () => {
    const user = userEvent.setup();
    getInvitationMock.mockResolvedValue({
      email: 'student@test.com',
      name: '김철수',
      role: 'student',
      expires_at: '2026-04-10T10:00:00',
    });

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('student@test.com')).toBeInTheDocument();

    await user.type(screen.getByLabelText('비밀번호'), 'short');
    await waitFor(() => {
      expect(screen.getByText('8자 이상')).toBeInTheDocument();
      expect(screen.getByText('비밀번호 확인 일치')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('비밀번호 확인'), 'different');
    await user.click(screen.getByRole('button', { name: '초대 수락' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('비밀번호는 8자 이상이어야 합니다.');
  });
});
