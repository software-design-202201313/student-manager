import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LandingPage from './LandingPage';

export default function RootIndex() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  if (token) {
    if (user?.role === 'student') return <Navigate to="/student" replace />;
    if (user?.role === 'parent') return <Navigate to="/parent" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <LandingPage />;
}
