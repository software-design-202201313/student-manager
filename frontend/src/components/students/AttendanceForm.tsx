import { useState } from 'react';
import type { Attendance } from '../../types';

export default function AttendanceForm({ onSubmit }: { onSubmit: (body: { date: string; status: Attendance['status']; note?: string }) => Promise<void> }) {
  const [date, setDate] = useState<string>('');
  const [status, setStatus] = useState<Attendance['status']>('present');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({ date, status, note: note || undefined });
      setDate(''); setStatus('present'); setNote('');
    } catch (e: any) {
      setError(e.response?.data?.detail || '저장 실패');
    }
  };

  return (
    <form onSubmit={handle} className="flex gap-2 items-end text-sm">
      {error && <div className="text-red-600">{error}</div>}
      <div>
        <label className="block text-gray-600">날짜</label>
        <input type="date" className="border p-1" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div>
        <label className="block text-gray-600">상태</label>
        <select className="border p-1" value={status} onChange={(e) => setStatus(e.target.value as Attendance['status'])}>
          <option value="present">출석</option>
          <option value="absent">결석</option>
          <option value="late">지각</option>
          <option value="early_leave">조퇴</option>
        </select>
      </div>
      <div>
        <label className="block text-gray-600">메모</label>
        <input className="border p-1" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="border px-3 py-1 rounded">추가</button>
    </form>
  );
}

