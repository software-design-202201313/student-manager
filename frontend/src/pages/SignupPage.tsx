import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { acceptInvitation, getInvitation, getMe } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

export default function SignupPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [invitation, setInvitation] = useState<{ email: string; name: string; role: string; expires_at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);

  useEffect(() => {
    if (!token) {
      setPreviewLoading(false);
      setError('유효한 초대 링크가 필요합니다.');
      return;
    }

    getInvitation(token)
      .then(setInvitation)
      .catch((err) => setError(err?.response?.data?.detail || '초대 링크를 확인할 수 없습니다.'))
      .finally(() => setPreviewLoading(false));
  }, [token]);

  const passwordRules = [
    { label: '8자 이상', passed: password.length >= 8 },
    { label: '비밀번호 확인 일치', passed: confirmPassword.length > 0 && password === confirmPassword },
  ];

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const tokenResponse = await acceptInvitation(token, password);
      setAccessToken(tokenResponse.access_token);
      const me = await getMe();
      setUser(me);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.detail || '초대 수락에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded shadow w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold">ClassFlow</div>
          <div className="text-sm text-gray-500 mt-1">초대받은 계정을 활성화하세요.</div>
        </div>

        {previewLoading ? (
          <div className="text-sm text-gray-500">초대 정보를 확인하는 중...</div>
        ) : invitation ? (
          <div className="rounded border bg-gray-50 p-3 text-sm space-y-2">
            <div className="font-medium">이 계정을 활성화합니다</div>
            <div><span className="text-gray-500">이름:</span> {invitation.name}</div>
            <div><span className="text-gray-500">이메일:</span> {invitation.email}</div>
            <div><span className="text-gray-500">역할:</span> {roleLabel(invitation.role)}</div>
            <div><span className="text-gray-500">만료:</span> {new Date(invitation.expires_at).toLocaleString()}</div>
          </div>
        ) : null}

        {error && <div className="text-sm text-red-600" role="alert">{error}</div>}

        <div>
          <label htmlFor="password" className="block text-sm text-gray-700 mb-1">비밀번호</label>
          <input
            id="password"
            type="password"
            className="border p-2 w-full rounded"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={!invitation || loading}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm text-gray-700 mb-1">비밀번호 확인</label>
          <input
            id="confirmPassword"
            type="password"
            className="border p-2 w-full rounded"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={!invitation || loading}
          />
        </div>

        <div className="rounded border bg-gray-50 p-3 text-sm space-y-2">
          <div className="font-medium">비밀번호 규칙</div>
          {passwordRules.map((rule) => (
            <div key={rule.label} className={rule.passed ? 'text-green-700' : 'text-gray-500'}>
              {rule.label}
            </div>
          ))}
        </div>

        <button
          className="bg-blue-600 text-white p-2 rounded w-full disabled:opacity-60"
          type="submit"
          disabled={!invitation || loading}
        >
          {loading ? '계정 활성화 중...' : '초대 수락'}
        </button>

        <div className="text-center text-sm text-gray-600">
          이미 활성화하셨나요? <Link to="/login" className="text-blue-600 hover:underline">로그인</Link>
        </div>
      </form>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === 'teacher') return '교사';
  if (role === 'parent') return '학부모';
  if (role === 'student') return '학생';
  return role;
}
