import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import apiClient from '../../api/client';
import { getMe } from '../../api/auth';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  const setToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  // Always bootstrap auth on mount — token may be null after reload
  const [checking, setChecking] = useState(true);
  const [bootstrapFailed, setBootstrapFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        if (!token) {
          // Use a bare axios call (no interceptors) to avoid recursive refresh handling
          const { data } = await axios.post<{ access_token: string }>(
            `${apiClient.defaults.baseURL}/auth/refresh`,
            {},
            { withCredentials: true },
          );
          if (cancelled) return;
          setToken(data.access_token);
        }
        // Fetch current user regardless (token may be already present)
        const me = await getMe();
        if (cancelled) return;
        setUser(me);
      } catch {
        // Mark bootstrap failure and hint user to login again
        setBootstrapFailed(true);
        toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token, setToken, setUser]);

  if (checking) return <div className="p-4">불러오는 중...</div>;
  if (!token) return <Navigate to={bootstrapFailed ? "/login?reason=expired" : "/login"} replace />;
  return <>{children}</>;
}
