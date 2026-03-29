import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getStudent, listAttendance, listSpecialNotes, createAttendance, createSpecialNote, deleteStudent } from '../api/students';
import StudentDetail from '../components/students/StudentDetail';
import AttendanceForm from '../components/students/AttendanceForm';
import SpecialNoteForm from '../components/students/SpecialNoteForm';
import type { Attendance, SpecialNote, StudentDetail as StudentDetailType } from '../types';
import StudentEditModal from '../components/students/StudentEditModal';
import toast from 'react-hot-toast';

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [student, setStudent] = useState<StudentDetailType | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notes, setNotes] = useState<SpecialNote[]>([]);
  const [showEdit, setShowEdit] = useState(false);

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">학생 상세</h1>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 text-sm border rounded"
            onClick={() => setShowEdit(true)}
          >
            수정
          </button>
          <button
            className="px-3 py-1 text-sm border rounded text-red-600 border-red-300"
            onClick={async () => {
              if (!confirm('학생을 삭제하시겠습니까?\n(출결, 특기사항, 성적, 상담, 연결된 학부모 정보가 함께 삭제됩니다)')) return;
              try {
                const removedId = student.id;
                await deleteStudent(removedId);
                // Optimistically drop this student from any cached student lists
                qc.setQueriesData<any[]>({ queryKey: ['students'] }, (old) => {
                  if (!Array.isArray(old)) return old;
                  return old.filter((s) => s && s.id !== removedId);
                });
                // Remove per-student caches that could trigger background fetches
                qc.removeQueries({ queryKey: ['student', removedId] });
                qc.removeQueries({ queryKey: ['attendance-today', removedId] });
                qc.removeQueries({ queryKey: ['special-notes', removedId] });
                // Ensure any remaining views refetch fresh lists
                qc.invalidateQueries({ queryKey: ['students'] });
                toast.success('학생을 삭제했습니다.');
                // 선택된 학급 유지
                navigate('/students');
              } catch {
                toast.error('삭제 중 오류가 발생했습니다.');
              }
            }}
          >
            삭제
          </button>
        </div>
      </div>
      <StudentDetail student={student} attendance={attendance} notes={notes} />
      <div className="space-y-4">
        <h2 className="font-semibold">출결 추가</h2>
        <AttendanceForm onSubmit={async (body) => { await createAttendance(studentId, body); await refreshAll(studentId); }} />
      </div>
      <div className="space-y-4">
        <h2 className="font-semibold">특기사항 추가</h2>
        <SpecialNoteForm onSubmit={async (body) => { await createSpecialNote(studentId, body); await refreshAll(studentId); }} />
      </div>
      {showEdit && (
        <StudentEditModal
          student={student}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setStudent(updated);
            setShowEdit(false);
            toast.success('학생 정보가 수정되었습니다.');
          }}
        />
      )}
    </div>
  );
}
