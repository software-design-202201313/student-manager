import type { StudentSummary, SpecialNote, Attendance as AttendanceType } from '../../types';
import { useStudent } from '../../hooks/useStudent';
import { useQuery } from '@tanstack/react-query';
import { listAttendance, listSpecialNotes } from '../../api/students';
import { useNavigate } from 'react-router-dom';

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

function StudentRow({ s }: { s: StudentSummary }) {
  const navigate = useNavigate();
  const { data: detail } = useStudent(s.id);
  const { data: attendance } = useAttendanceToday(s.id);
  const { data: notes } = useLatestSpecialNote(s.id);
  const latestNote = (notes || [])
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];

  return (
    <tr
      className="border-b hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/students/${s.id}`)}
    >
      <td className="p-2 border text-center">{s.student_number}</td>
      <td className="p-2 border">{s.name}</td>
      <td className="p-2 border text-center">{genderLabel(detail?.gender)}</td>
      <td className="p-2 border text-center">{attendanceLabel(attendance && attendance[0]?.status)}</td>
      <td className="p-2 border">
        {latestNote ? (
          <span title={latestNote.content}>
            {latestNote.content.length > 24 ? latestNote.content.slice(0, 24) + '…' : latestNote.content}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
}

export default function StudentList({ students }: { students: StudentSummary[] }) {
  const sorted = students.slice().sort((a, b) => a.student_number - b.student_number);
  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-50">
        <tr>
          <th className="p-2 border">번호</th>
          <th className="p-2 border">이름</th>
          <th className="p-2 border">성별</th>
          <th className="p-2 border">오늘 출결</th>
          <th className="p-2 border">특이사항</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((s) => (
          <StudentRow key={s.id} s={s} />
        ))}
      </tbody>
    </table>
  );
}
