import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { bootstrapSession } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import LandingPage from './LandingPage';

export default function RootIndex() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [checking, setChecking] = useState(!token);

  useEffect(() => {
    if (token) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    bootstrapSession()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (checking) return <div className="p-4">불러오는 중...</div>;
  if (token) {
    if (user?.role === 'student') return <Navigate to="/student" replace />;
    if (user?.role === 'parent') return <Navigate to="/parent" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <LandingPage />;
}
