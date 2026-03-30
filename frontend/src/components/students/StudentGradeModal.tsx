import { useEffect, useMemo, useState } from 'react';
import { listSemesters } from '../../api/semesters';
import { getStudent } from '../../api/students';
import { listSubjects } from '../../api/classes';
import { useGrades, useUpsertGrade } from '../../hooks/useGrades';
import GradeTable from '../grades/GradeTable';
import GradeExcelUploadModal from '../grades/GradeExcelUploadModal';
import type { Semester, Subject, StudentDetail } from '../../types';
import { calculateGradeSummary } from '../../utils/gradeSummary';

type Props = {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export default function StudentGradeModal({ studentId, studentName, onClose, onPrev, onNext }: Props) {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [semesterId, setSemesterId] = useState<string>('');
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showGradeUpload, setShowGradeUpload] = useState(false);
  const [latestValues, setLatestValues] = useState<Record<string, string>>({});

  // bootstrap basic data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sems, s] = await Promise.all([listSemesters(), getStudent(studentId)]);
        if (cancelled) return;
        setSemesters(sems);
        const last = safeGetLocal('lastSemesterId');
        const sid = (last && sems.find((x) => x.id === last)?.id) || sems[0]?.id || '';
        setSemesterId(sid);
        setStudent(s);
        const subs = await listSubjects(s.class_id);
        if (!cancelled) setSubjects(subs);
      } catch (e) {
        // no-op basic error handling; parent context will still render modal shell
        // eslint-disable-next-line no-console
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  // grades for current semester
  const { data: grades } = useGrades(studentId || '', semesterId || undefined);
  const upsert = useUpsertGrade(studentId || '', semesterId || undefined);

  const gradeMap = useMemo(() => new Map((grades || []).map((g) => [g.subject_id, g])), [grades]);

  const { total, average, filledCount } = useMemo(
    () => calculateGradeSummary(subjects, gradeMap, latestValues),
    [subjects, gradeMap, latestValues],
  );

  const classId = student?.class_id || '';

  const headerLabel = useMemo(() => {
    const sem = semesters.find((s) => s.id === semesterId);
    if (!sem) return `${studentName} — 성적 입력`;
    return `${studentName} — ${sem.year}년 ${sem.term}학기 성적 입력`;
  }, [studentName, semesters, semesterId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="font-semibold">{headerLabel}</h2>
            <div className="text-xs text-gray-600">입력된 과목 {filledCount}개 · 총점 {total ?? '-'} · 평균 {average ?? '-'}</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">학기</label>
            <select
              className="border p-1 text-sm"
              value={semesterId}
              onChange={(e) => {
                setSemesterId(e.target.value);
                safeSetLocal('lastSemesterId', e.target.value);
              }}
            >
              {semesters.map((sm) => (
                <option key={sm.id} value={sm.id}>{`${sm.year}년 ${sm.term}학기`}</option>
              ))}
            </select>
            <button onClick={onPrev} className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={!onPrev}>
              이전 학생
            </button>
            <button onClick={onNext} className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={!onNext}>
              다음 학생
            </button>
            <button onClick={onClose} className="px-2 py-1 text-sm border rounded">닫기</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-auto">
          {!semesterId || !classId ? (
            <div className="text-gray-600">학기 또는 학급 정보를 불러오는 중...</div>
          ) : subjects.length === 0 ? (
            <div className="text-gray-600">해당 학급에 과목이 없습니다. 과목을 먼저 등록하세요.</div>
          ) : (
            <GradeTable
              subjects={subjects}
              grades={grades || []}
              semesterId={semesterId}
              studentId={studentId}
              onUpsert={async ({ gradeId, subject_id, score }) => {
                await upsert.mutateAsync({ gradeId, student_id: studentId, subject_id, semester_id: semesterId, score });
              }}
              onValuesChange={(vals) => setLatestValues(vals)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">총점: <b>{total ?? '-'}</b> · 평균: <b>{average ?? '-'}</b></div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded text-sm border"
              onClick={() => setShowGradeUpload(true)}
              disabled={!classId || !semesterId}
            >
              엑셀로 성적 등록
            </button>
          </div>
        </div>

        {showGradeUpload && classId && semesterId && (
          <GradeExcelUploadModal classId={classId} semesterId={semesterId} onClose={() => setShowGradeUpload(false)} />
        )}
      </div>
    </div>
  );
}

function safeGetLocal(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetLocal(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
