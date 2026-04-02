import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestPasswordRecovery, resetPassword } from '../api/auth';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(token ? null : null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRequestRecovery = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const response = await requestPasswordRecovery(email.trim());
      setPreviewUrl(response.preview_url ?? null);
      setSuccess('재설정 링크를 확인하세요. 스텁 환경에서는 아래 링크로 바로 진행할 수 있습니다.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || '비밀번호 재설정 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

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
      await resetPassword(token, password);
      setSuccess('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      navigate('/login');
    } catch (err: any) {
      setError(err?.response?.data?.detail || '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isResetMode = Boolean(token);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={isResetMode ? onResetPassword : onRequestRecovery} className="bg-white p-6 rounded shadow w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold">ClassFlow</div>
          <p className="text-gray-600">{isResetMode ? '새 비밀번호 설정' : '비밀번호 재설정'}</p>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{success}</div>}

        {isResetMode ? (
          <>
            <div>
              <label htmlFor="password" className="block text-sm text-gray-700 mb-1">새 비밀번호</label>
              <input id="password" type="password" className="border p-2 w-full rounded" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-gray-700 mb-1">새 비밀번호 확인</label>
              <input id="confirmPassword" type="password" className="border p-2 w-full rounded" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="email" className="block text-sm text-gray-700 mb-1">이메일</label>
            <input id="email" type="email" className="border p-2 w-full rounded" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
        )}

        {previewUrl && !isResetMode && (
          <a href={previewUrl} className="block text-sm text-blue-600 hover:underline break-all">
            스텁 재설정 링크 열기
          </a>
        )}

        <button className="bg-blue-600 text-white p-2 rounded w-full disabled:opacity-60" type="submit" disabled={loading}>
          {loading ? '처리 중...' : isResetMode ? '비밀번호 변경' : '재설정 링크 받기'}
        </button>

        <div className="text-center text-sm text-gray-600">
          <Link to="/login" className="text-blue-600 hover:underline">로그인으로 돌아가기</Link>
        </div>
      </form>
    </div>
  );
}
