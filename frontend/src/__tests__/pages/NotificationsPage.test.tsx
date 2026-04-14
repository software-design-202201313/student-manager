import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listNotificationsMock = vi.fn(async (_params?: unknown) => [
  {
    id: 'n1',
    type: 'grade_input',
    message: '학생-notify-1774877221554-vqgxos의 수학-notify-1774877221554-vqgxos 성적이 저장되었습니다.',
    is_read: false,
    related_id: 'stu1',
    related_type: 'grade',
    created_at: '2026-03-30T10:00:00Z',
  },
  {
    id: 'n2',
    type: 'feedback_created',
    message: '홍길동 피드백이 등록되었습니다.',
    is_read: false,
    related_id: 'stu1',
    related_type: 'feedback',
    created_at: '2026-03-30T10:01:00Z',
  },
  {
    id: 'n3',
    type: 'counseling_updated',
    message: '홍길동 상담 기록이 업데이트되었습니다.',
    is_read: false,
    related_id: 'stu1',
    related_type: 'counseling',
    created_at: '2026-03-30T10:02:00Z',
  },
  {
    id: 'n4',
    type: 'feedback_created',
    message: '김영희 피드백이 등록되었습니다.',
    is_read: false,
    related_id: 'stu2',
    related_type: 'feedback',
    created_at: '2026-03-30T10:03:00Z',
  },
  {
    id: 'n5',
    type: 'counseling_updated',
    message: '김영희 상담 기록이 업데이트되었습니다.',
    is_read: false,
    related_id: 'stu2',
    related_type: 'counseling',
    created_at: '2026-03-30T10:04:00Z',
  },
  {
    id: 'n6',
    type: 'feedback_created',
    message: '최민수 피드백이 등록되었습니다.',
    is_read: false,
    related_id: 'stu3',
    related_type: 'feedback',
    created_at: '2026-03-30T10:05:00Z',
  },
]);

let currentPreferences = {
  grade_input: true,
  feedback_created: true,
  counseling_updated: true,
};

const getPreferencesMock = vi.fn(async () => currentPreferences);

const updatePreferencesMock = vi.fn(async (preferences) => {
  currentPreferences = preferences;
  return preferences;
});

vi.mock('../../api/notifications', () => ({
  listNotifications: (params?: unknown) => listNotificationsMock(params),
  getPreferences: () => getPreferencesMock(),
  updatePreferences: (preferences: typeof currentPreferences) => updatePreferencesMock(preferences),
  markRead: vi.fn(async (id: string) => ({ id, is_read: true })),
  markAllRead: vi.fn(async () => ({ updated: 6 })),
}));

import NotificationsPage from '../../pages/NotificationsPage';
import { useAuthStore } from '../../stores/authStore';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPreferences = {
      grade_input: true,
      feedback_created: true,
      counseling_updated: true,
    };
    useAuthStore.setState({
      accessToken: 'token',
      user: { id: 't1', email: 'teacher@test.com', name: '교사', role: 'teacher', school_id: 'school1' },
    });
  });

  it('formats messages for display, paginates after five items, and filters by settings', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByRole('heading', { name: '알림' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('학생 · 수학 성적이 저장되었어요.')).toBeInTheDocument());
    expect(screen.getByText('홍길동 · 새 피드백이 등록되었어요.')).toBeInTheDocument();
    expect(screen.queryByText('최민수 · 새 피드백이 등록되었어요.')).not.toBeInTheDocument();
    expect(screen.queryByText('grade_input')).not.toBeInTheDocument();
    expect(screen.getByText('성적 입력')).toBeInTheDocument();
    expect(screen.getAllByText('피드백').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다음 페이지' }));
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeInTheDocument());
    expect(screen.getByText('최민수 · 새 피드백이 등록되었어요.')).toBeInTheDocument();
    expect(screen.queryByText('학생 · 수학 성적이 저장되었어요.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '이전 페이지' }));
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeInTheDocument());

    await user.click(screen.getByLabelText('성적 입력 알림'));
    await user.click(screen.getByRole('button', { name: '설정 저장' }));

    await waitFor(() => expect(updatePreferencesMock).toHaveBeenCalled());
    expect(updatePreferencesMock.mock.calls[0][0]).toEqual({
      grade_input: false,
      feedback_created: true,
      counseling_updated: true,
    });
    await waitFor(() => expect(screen.queryByText('학생 · 수학 성적이 저장되었어요.')).not.toBeInTheDocument());
    expect(screen.getByText('홍길동 · 새 피드백이 등록되었어요.')).toBeInTheDocument();
    expect(screen.queryByText('1 / 2')).not.toBeInTheDocument();
  });
});
