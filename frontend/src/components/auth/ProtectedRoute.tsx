import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { bootstrapSession, getMe } from '../../api/auth';

function getDefaultRoute(role?: string | null) {
  if (role === 'student') return '/student';
  if (role === 'parent') return '/parent';
  if (role === 'teacher') return '/dashboard';
  return '/login';
}

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: string[];
}) {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
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
          const { token: nextToken, user: nextUser } = await bootstrapSession();
          if (cancelled) return;
          setToken(nextToken);
          setUser(nextUser);
          return;
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
  if (roles && (!user || !roles.includes(user.role))) {
    return <Navigate to={getDefaultRoute(user?.role)} replace />;
  }
  return <>{children}</>;
}
