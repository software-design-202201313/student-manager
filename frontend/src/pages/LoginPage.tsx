import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, getMe } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [role, setRole] = useState<'student' | 'parent' | 'teacher'>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

    // Basic validation
    const emailTrim = email.trim();
    const passwordTrim = password.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim);
    if (!emailTrim || !emailValid) {
      setError('유효한 이메일 주소를 입력하세요.');
      return;
    }
    if (!passwordTrim) {
      setError('비밀번호를 입력하세요.');
      return;
    }

    setLoading(true);
    try {
      // POST to /auth/login with email, password (role is UI-only per spec)
      const tok = await login(emailTrim, passwordTrim);

      // Store token per remember selection
      if (remember) {
        try { localStorage.setItem('accessToken', tok.access_token); } catch {}
      } else {
        try { sessionStorage.setItem('accessToken', tok.access_token); } catch {}
      }
      setAccessToken(tok.access_token);

      // Fetch current user and store
      const me = await getMe();
      setUser(me);

      // Redirect to root
      navigate('/');
    } catch (e: any) {
      // 실패 시 고정 문구
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={onSubmit} autoComplete="on" {...pmAttrs} className="bg-white p-6 rounded shadow w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold">ClassFlow</div>
          <div className="text-sm text-gray-500 mt-1">다시 오신 것을 환영합니다. 계속하려면 로그인하세요.</div>
        </div>

        {reason === 'expired' && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            세션이 만료되었습니다. 다시 로그인해주세요.
          </div>
        )}
        {error && <div className="text-red-600 text-sm" role="alert">{error}</div>}

        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="역할 선택">
          {([
            { key: 'student', label: '학생' },
            { key: 'parent', label: '학부모' },
            { key: 'teacher', label: '교사' },
          ] as const).map((opt) => (
            <label key={opt.key} className={`border rounded p-2 text-center cursor-pointer select-none ${role === opt.key ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
              <input
                type="radio"
                name="role"
                className="sr-only"
                value={opt.key}
                checked={role === opt.key}
                onChange={() => setRole(opt.key)}
                aria-label={opt.label}
              />
              {opt.label}
            </label>
          ))}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm text-gray-700 mb-1">이메일</label>
          <input
            id="email"
            className="border p-2 w-full rounded"
            placeholder="이메일"
            type="email"
            name="email"
            autoComplete="username email"
            required
            {...pmAttrs}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-700 mb-1">비밀번호</label>
          <input
            id="password"
            className="border p-2 w-full rounded"
            placeholder="비밀번호"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            {...pmAttrs}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            로그인 상태 유지
          </label>
          <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">비밀번호를 잊으셨나요?</Link>
        </div>

        <button
          className="bg-blue-600 text-white p-2 rounded w-full disabled:opacity-60"
          type="submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        <div className="text-center text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-blue-600 hover:underline">회원가입</Link>
        </div>
      </form>
    </div>
  );
}
