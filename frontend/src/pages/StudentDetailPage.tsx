import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getStudent, listAttendance, listSpecialNotes, createAttendance, createSpecialNote } from '../api/students';
import StudentDetail from '../components/students/StudentDetail';
import AttendanceForm from '../components/students/AttendanceForm';
import SpecialNoteForm from '../components/students/SpecialNoteForm';
import type { Attendance, SpecialNote, StudentDetail as StudentDetailType } from '../types';

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const [student, setStudent] = useState<StudentDetailType | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notes, setNotes] = useState<SpecialNote[]>([]);

  async function refreshAll(id: string) {
    const [s, a, n] = await Promise.all([
      getStudent(id),
      listAttendance(id),
      listSpecialNotes(id),
    ]);
    setStudent(s); setAttendance(a); setNotes(n);
  }

  useEffect(() => {
    if (studentId) {
      refreshAll(studentId);
    }
  }, [studentId]);

  if (!studentId) return <div>잘못된 접근입니다.</div>;
  if (!student) return <div>불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">학생 상세</h1>
      <StudentDetail student={student} attendance={attendance} notes={notes} />
      <div className="space-y-4">
        <h2 className="font-semibold">출결 추가</h2>
        <AttendanceForm onSubmit={async (body) => { await createAttendance(studentId, body); await refreshAll(studentId); }} />
      </div>
      <div className="space-y-4">
        <h2 className="font-semibold">특기사항 추가</h2>
        <SpecialNoteForm onSubmit={async (body) => { await createSpecialNote(studentId, body); await refreshAll(studentId); }} />
      </div>
    </div>
  );
}

