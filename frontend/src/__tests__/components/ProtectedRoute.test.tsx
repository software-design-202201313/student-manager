import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('../../api/client', () => ({
  default: {
    defaults: { baseURL: '/api/v1' },
  },
}));

const getMeMock = vi.fn();
vi.mock('../../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../../api/auth')>('../../api/auth');
  return {
    ...actual,
    getMe: (...args: any[]) => getMeMock(...args),
  };
});

import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuthStore } from '../../stores/authStore';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'token',
      user: { id: 'p1', email: 'parent@test.com', name: '학부모', role: 'parent', school_id: 'school1' },
    });
    getMeMock.mockResolvedValue({ id: 'p1', email: 'parent@test.com', name: '학부모', role: 'parent', school_id: 'school1' });
  });

  it('redirects to the role home when the route role is not allowed', async () => {
    render(
      <MemoryRouter initialEntries={['/student']}>
        <Routes>
          <Route
            path="/student"
            element={
              <ProtectedRoute roles={['student']}>
                <div>학생 전용</div>
              </ProtectedRoute>
            }
          />
          <Route path="/parent" element={<div>학부모 홈</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('학부모 홈')).toBeInTheDocument());
  });
});
