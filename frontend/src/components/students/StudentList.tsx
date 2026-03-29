import type { StudentSummary, SpecialNote, Attendance as AttendanceType } from '../../types';
import { useState } from 'react';
import { useStudent } from '../../hooks/useStudent';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAttendance, listSpecialNotes, createAttendance, updateAttendance } from '../../api/students';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import StudentGradeModal from './StudentGradeModal';

function formatDateYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function useAttendanceToday(studentId: string) {
  const today = formatDateYYYYMMDD(new Date());
  return useQuery<AttendanceType[]>({
    queryKey: ['attendance-today', studentId, today],
    queryFn: () => listAttendance(studentId, { start_date: today, end_date: today }),
  });
}

function useLatestSpecialNote(studentId: string) {
  return useQuery<SpecialNote[]>({
    queryKey: ['special-notes', studentId],
    queryFn: () => listSpecialNotes(studentId),
  });
}

function genderLabel(g?: string | null) {
  if (!g) return '-';
  if (g === 'male') return '남';
  if (g === 'female') return '여';
  return g;
}

function attendanceLabel(status?: AttendanceType['status']) {
  switch (status) {
    case 'present':
      return '출석';
    case 'absent':
      return '결석';
    case 'late':
      return '지각';
    case 'early_leave':
      return '조퇴';
    default:
      return '-';
  }
}

function StudentRow({ s, onOpenGrade }: { s: StudentSummary; onOpenGrade: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: detail } = useStudent(s.id);
  const { data: attendance } = useAttendanceToday(s.id);
  const { data: notes } = useLatestSpecialNote(s.id);
  const latestNote = (notes || [])
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];

  const todayStr = formatDateYYYYMMDD(new Date());
  const current = attendance && attendance[0];

  const { mutate: setTodayStatus, isPending } = useMutation({
    mutationFn: async (status: AttendanceType['status']) => {
      if (current) {
        return updateAttendance(s.id, current.id, { date: current.date, status, note: current.note ?? null });
      }
      return createAttendance(s.id, { date: todayStr, status });
    },
    onSuccess: (saved) => {
      // Update cache for today's attendance for this student
      qc.setQueryData<AttendanceType[]>(['attendance-today', s.id, todayStr], (old) => {
        if (!old || old.length === 0) return [saved];
        return [{ ...old[0], status: saved.status, note: saved.note }];
      });
      toast.success('오늘 출결을 저장했습니다.');
    },
    onError: () => {
      toast.error('출결 저장 중 오류가 발생했습니다.');
    },
  });

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="p-2 border text-center">{s.student_number}</td>
      <td className="p-2 border text-center">
        <button
          className="text-blue-600 hover:underline"
          type="button"
          onClick={() => navigate(`/students/${s.id}`)}
        >
          {s.name}
        </button>
      </td>
      <td className="p-2 border text-center">{genderLabel(detail?.gender)}</td>
      <td className="p-2 border text-center">
        <select
          className="border rounded px-1 py-0.5 text-sm"
          value={current?.status ?? ''}
          onChange={(e) => {
            const val = e.target.value as AttendanceType['status'] | '';
            if (!val) return;
            setTodayStatus(val);
          }}
          disabled={isPending}
        >
          <option value="" disabled>
            선택
          </option>
          <option value="present">출석</option>
          <option value="absent">결석</option>
          <option value="late">지각</option>
          <option value="early_leave">조퇴</option>
        </select>
      </td>
      <td className="p-2 border">
        {latestNote ? (
          <span title={latestNote.content}>
            {latestNote.content.length > 24 ? latestNote.content.slice(0, 24) + '…' : latestNote.content}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="p-2 border text-center">
        <button
          type="button"
          className="px-2 py-1 text-xs border rounded"
          onClick={onOpenGrade}
        >
          성적 입력
        </button>
      </td>
    </tr>
  );
}

export default function StudentList({ students }: { students: StudentSummary[] }) {
  const sorted = students.slice().sort((a, b) => a.student_number - b.student_number);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const current = openIndex != null ? sorted[openIndex] : null;

  return (
    <>
      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 border">번호</th>
            <th className="p-2 border text-center">이름</th>
            <th className="p-2 border">성별</th>
            <th className="p-2 border">오늘 출결</th>
            <th className="p-2 border">특이사항</th>
            <th className="p-2 border">성적</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, idx) => (
            <StudentRow key={s.id} s={s} onOpenGrade={() => setOpenIndex(idx)} />
          ))}
        </tbody>
      </table>

      {current && (
        <StudentGradeModal
          studentId={current.id}
          studentName={current.name}
          onClose={() => setOpenIndex(null)}
          onPrev={openIndex && openIndex > 0 ? () => setOpenIndex((i) => (i != null && i > 0 ? i - 1 : i)) : undefined}
          onNext={openIndex != null && openIndex < sorted.length - 1 ? () => setOpenIndex((i) => (i != null ? i + 1 : i)) : undefined}
        />
      )}
    </>
  );
}
