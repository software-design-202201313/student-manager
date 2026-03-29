import { useMemo, useState } from 'react';
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
  const params = new URLSearchParams(window.location.search);
  const reason = useMemo(() => params.get('reason'), [params.toString()]);

  // In dev, ask password managers to ignore to avoid buggy overlays
  const pmIgnore = import.meta.env.MODE !== 'production';
  const pmAttrs = pmIgnore
    ? ({ 'data-bwignore': 'true', 'data-1p-ignore': 'true', 'data-lpignore': 'true' } as const)
    : ({} as const);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const tok = await login(email, password);
      setAccessToken(tok.access_token);
      const me = await getMe();
      setUser(me);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.detail || '로그인 실패');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} autoComplete="on" {...pmAttrs} className="bg-white p-6 rounded shadow w-80 space-y-3">
        <h1 className="text-xl font-semibold">Student Manager</h1>
        {reason === 'expired' && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            세션이 만료되었습니다. 다시 로그인해주세요.
          </div>
        )}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label htmlFor="email" className="block text-sm text-gray-600 mb-1">이메일</label>
          <input
            id="email"
            className="border p-2 w-full rounded"
            placeholder="teacher@example.com"
            type="email"
            name="email"
            autoComplete="username email"
            {...pmAttrs}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-gray-600 mb-1">비밀번호</label>
          <input
            id="password"
            className="border p-2 w-full rounded"
            placeholder="비밀번호를 입력하세요"
            type="password"
            name="password"
            autoComplete="current-password"
            {...pmAttrs}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="bg-blue-600 text-white p-2 rounded w-full" type="submit">로그인</button>
      </form>
    </div>
  );
}
