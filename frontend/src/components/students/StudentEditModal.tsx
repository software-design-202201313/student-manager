import { useState } from 'react';
import type { StudentDetail } from '../../types';
import { updateStudent } from '../../api/students';

export default function StudentEditModal({
  student,
  onClose,
  onSaved,
}: {
  student: StudentDetail;
  onClose: () => void;
  onSaved: (updated: StudentDetail) => void;
}) {
  const [name, setName] = useState(student.name);
  const [studentNumber, setStudentNumber] = useState<number>(student.student_number);
  const [birthDate, setBirthDate] = useState<string>(student.birth_date ?? '');
  const [gender, setGender] = useState<string>(student.gender ?? '');
  const [phone, setPhone] = useState<string>(student.phone ?? '');
  const [address, setAddress] = useState<string>(student.address ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-xl p-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">학생 정보 수정</h2>
          <button onClick={onClose} className="text-gray-500">×</button>
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="space-y-2">
          <div>
            <label className="block text-sm">이름</label>
            <input className="border p-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">번호</label>
            <input
              className="border p-1 w-full"
              type="number"
              value={studentNumber}
              onChange={(e) => setStudentNumber(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm">생년월일</label>
            <input className="border p-1 w-full" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">성별</label>
            <select className="border p-1 w-full" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">선택 안함</option>
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
          </div>
          <div>
            <label className="block text-sm">연락처</label>
            <input className="border p-1 w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">주소</label>
            <input className="border p-1 w-full" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-3 py-1 text-sm border rounded">취소</button>
          <button
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                const updated = await updateStudent(student.id, {
                  name,
                  student_number: studentNumber,
                  birth_date: birthDate || undefined,
                  gender: gender || undefined,
                  phone: phone || undefined,
                  address: address || undefined,
                });
                onSaved(updated);
              } catch (e: any) {
                const code = e?.response?.data?.code;
                if (code === 'STUDENT_DUPLICATE_NUMBER') setError('이미 존재하는 번호입니다.');
                else setError('수정 중 오류가 발생했습니다.');
              } finally {
                setSaving(false);
              }
            }}
            disabled={!name || saving}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

