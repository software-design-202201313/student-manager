import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LandingPage from './LandingPage';

export default function RootIndex() {
  const token = useAuthStore((s) => s.accessToken);
  if (token) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

