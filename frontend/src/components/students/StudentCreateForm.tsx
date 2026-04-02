import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createParentAccount, createStudentAccount } from '../../api/users';
import type { OnboardingAccount, StudentOnboardingResult } from '../../types';

type OnboardingState = {
  student: StudentOnboardingResult;
  parent?: OnboardingAccount | null;
};

export default function StudentCreateForm({ classId, nextStudentNumber = 1, onClose }: { classId: string; nextStudentNumber?: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<OnboardingState | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const student = await createStudentAccount({
        email,
        name,
        class_id: classId,
        student_number: nextStudentNumber,
        birth_date: birthDate || undefined,
      });

      let parent: OnboardingAccount | null = null;
      if (parentName.trim() && parentEmail.trim()) {
        parent = await createParentAccount({
          email: parentEmail.trim(),
          name: parentName.trim(),
          student_id: student.id,
        });
      }

      return { student, parent };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['students', { classId }] });
      setCreated(result);
    },
    onError: (e: any) => {
      const code = e?.response?.data?.code;
      if (code === 'STUDENT_DUPLICATE_NUMBER') setError('이미 존재하는 번호입니다.');
      else if (code === 'USER_DUPLICATE_EMAIL') setError('이미 사용 중인 이메일입니다.');
      else setError(e?.response?.data?.detail || '등록 중 오류가 발생했습니다.');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-xl p-4 w-full max-w-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">학생 초대 등록</h2>
          <button onClick={onClose} className="text-gray-500">×</button>
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        {created ? (
          <div className="space-y-3">
            <InviteCard title="학생 초대" name={created.student.name} email={created.student.email} inviteUrl={created.student.invite_url} />
            {created.parent && <InviteCard title="학부모 초대" name={created.parent.name} email={created.parent.email} inviteUrl={created.parent.invite_url} />}
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={onClose} className="px-3 py-1 text-sm bg-indigo-600 text-white rounded">닫기</button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div>
                <label className="block text-sm">학생 이름</label>
                <input className="border p-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm">학생 이메일</label>
                <input className="border p-1 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm">생년월일</label>
                <input className="border p-1 w-full" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div className="rounded border bg-gray-50 p-3 space-y-2">
                <div className="text-sm font-medium">학부모 초대 (선택)</div>
                <div>
                  <label className="block text-sm">학부모 이름</label>
                  <input className="border p-1 w-full" value={parentName} onChange={(e) => setParentName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm">학부모 이메일</label>
                  <input className="border p-1 w-full" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={onClose} className="px-3 py-1 text-sm border rounded">취소</button>
              <button
                onClick={() => mutation.mutate()}
                disabled={!name || !email || mutation.isPending}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded disabled:opacity-50"
              >
                {mutation.isPending ? '등록 중...' : '초대 생성'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InviteCard({ title, name, email, inviteUrl }: { title: string; name: string; email: string; inviteUrl?: string | null }) {
  return (
    <div className="rounded border p-3 space-y-2">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-gray-600">{name} · {email}</div>
      {inviteUrl ? (
        <>
          <div className="text-sm break-all text-blue-700">{inviteUrl}</div>
          <button
            type="button"
            className="px-2 py-1 text-xs border rounded"
            onClick={() => navigator.clipboard?.writeText(inviteUrl)}
          >
            링크 복사
          </button>
        </>
      ) : (
        <div className="text-sm text-gray-500">초대 링크를 생성하지 못했습니다.</div>
      )}
    </div>
  );
}
