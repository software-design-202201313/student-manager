import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getMe } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('teacher@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const tok = await login(email, password);
      setAccessToken(tok.access_token);
      const me = await getMe();
      setUser(me);
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.detail || '로그인 실패');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded shadow w-80 space-y-3">
        <h1 className="text-xl font-semibold">Student Manager</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input className="border p-2 w-full" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="border p-2 w-full" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="bg-blue-600 text-white p-2 rounded w-full" type="submit">로그인</button>
      </form>
    </div>
  );
}

