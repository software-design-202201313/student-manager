import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { listClasses, deleteClass, listSubjects } from '../api/classes';
import { useStudents } from '../hooks/useStudents';
import StudentList from '../components/students/StudentList';
import ExcelUploadModal from '../components/students/ExcelUploadModal';
import StudentCreateForm from '../components/students/StudentCreateForm';
import ClassCreateModal from '../components/classes/ClassCreateModal';
import type { ClassSummary } from '../types';
import { exportStudentsToExcel } from '../utils/exportHelpers';

export default function StudentListPage() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classId, setClassId] = useState<string | undefined>(undefined);
  // Default to first class when available (set once classes arrive)
  useEffect(() => {
    if (!classId && classes.length > 0) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);
  const effectiveClassId = useMemo(() => classId, [classId]);
  const { data: students, isLoading } = useStudents(effectiveClassId);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showClassCreate, setShowClassCreate] = useState(false);

  const currentClassLabel = useMemo(() => {
    const c = classes.find((x) => x.id === effectiveClassId);
    return c ? `${c.year}학년도 ${c.grade}학년 ${c.name}` : undefined;
  }, [classes, effectiveClassId]);

  const nextStudentNumber = useMemo(() => {
    if (!students || students.length === 0) return 1;
    return Math.max(...students.map((s) => s.student_number)) + 1;
  }, [students]);

  useEffect(() => {
    (async () => {
      try {
        const cls = await listClasses();
        setClasses(cls);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">학생 목록</h1>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">학급 선택</label>
          {classes.length > 0 ? (
            <select className="border p-1" value={effectiveClassId || ''} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{`${c.year}학년도 ${c.grade}학년 ${c.name}`}</option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">학급이 없습니다.</span>
              <button className="px-2 py-1 text-sm border rounded" onClick={() => setShowClassCreate(true)}>학급 만들기</button>
            </div>
          )}
          {classes.length > 0 && (
            <button className="px-2 py-1 text-sm border rounded" onClick={() => setShowClassCreate(true)}>학급 추가</button>
          )}
          <button
            className="px-2 py-1 text-sm border rounded text-red-700 border-red-300 disabled:opacity-50"
            disabled={!effectiveClassId}
            onClick={async () => {
              if (!effectiveClassId) return;
              const target = classes.find((c) => c.id === effectiveClassId);
              const label = target ? `${target.year}학년도 ${target.grade}학년 ${target.name}` : '이 학급';
              // 데이터 존재 여부 확인 (학생/과목)
              let hasData = false;
              try {
                const subs = await listSubjects(effectiveClassId);
                hasData = (students && students.length > 0) || (subs && subs.length > 0);
              } catch {
                hasData = !!(students && students.length > 0);
              }
              const confirmMsg = hasData
                ? `${label}에 데이터가 있습니다.\n정말로 삭제하시겠습니까?\n(학생/과목/성적/상담/피드백 등이 함께 삭제됩니다)`
                : `${label}을(를) 삭제하시겠습니까?`;
              if (!confirm(confirmMsg)) return;
              try {
                await deleteClass(effectiveClassId, { force: hasData });
                const next = classes.filter((c) => c.id !== effectiveClassId);
                setClasses(next);
                setClassId(next.length > 0 ? next[0].id : undefined);
                toast.success('학급을 삭제했습니다.');
              } catch (e: any) {
                const code = e?.response?.data?.code;
                if (code === 'CLASS_NOT_EMPTY') toast.error('학생/과목이 있어 삭제할 수 없습니다.');
                else toast.error('삭제 중 오류가 발생했습니다.');
              }
            }}
          >
            학급 삭제
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded text-sm border"
            onClick={() => {
              if (!effectiveClassId) {
                toast.error('학급을 먼저 선택하세요.');
                return;
              }
              setShowCreateForm(true);
            }}
          >
            학생 추가
          </button>
          <button
            className="px-3 py-1 rounded text-sm border"
            onClick={() => {
              if (!effectiveClassId) {
                toast.error('학급을 먼저 선택하세요.');
                return;
              }
              setShowUploadModal(true);
            }}
          >
            엑셀로 등록
          </button>
          <button
            className="px-3 py-1 rounded text-sm border"
            disabled={!students || students.length === 0}
            onClick={async () => {
              if (students) await exportStudentsToExcel(students, currentClassLabel);
            }}
          >
            엑셀로 내보내기
          </button>
        </div>
      </div>
      {isLoading ? (
        <div>불러오는 중...</div>
      ) : students ? (
        <StudentList students={students} />
      ) : (
        <div>학생이 없습니다.</div>
      )}
      {showUploadModal && effectiveClassId && (
        <ExcelUploadModal classId={effectiveClassId} onClose={() => setShowUploadModal(false)} />
      )}
      {showCreateForm && effectiveClassId && (
        <StudentCreateForm classId={effectiveClassId} nextStudentNumber={nextStudentNumber} onClose={() => setShowCreateForm(false)} />
      )}
      {showClassCreate && (
        <ClassCreateModal
          onClose={() => setShowClassCreate(false)}
          onCreated={(c) => {
            setClasses((prev) => [...prev, c]);
            setClassId(c.id);
          }}
        />
      )}
    </div>
  );
}
