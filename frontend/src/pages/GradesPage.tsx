import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStudent } from '../api/students';
import { listSemesters } from '../api/semesters';
import { listSubjects } from '../api/classes';
import { useGrades, useUpsertGrade } from '../hooks/useGrades';
import GradeTable from '../components/grades/GradeTable';
import GradeRadarChart from '../components/grades/RadarChart';
import GradeExcelUploadModal from '../components/grades/GradeExcelUploadModal';
import type { Semester, Subject } from '../types';
import { exportGradesToExcel, exportGradesToPDF, exportRadarChartToPNG } from '../utils/exportHelpers';
import { calculateGradeSummary } from '../utils/gradeSummary';

type Tab = 'table' | 'chart';

export default function GradesPage() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [semesterId, setSemesterId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [tab, setTab] = useState<Tab>('table');
  const [showGradeUpload, setShowGradeUpload] = useState(false);
  const [classIdFromStudent, setClassIdFromStudent] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [latestValues, setLatestValues] = useState<Record<string, string>>({});
  const [compare, setCompare] = useState(false);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const { data: grades } = useGrades(studentId || '', semesterId || undefined);
  const prevSemesterId = useMemo(() => {
    if (!semesters.length || !semesterId) return undefined;
    const currentIndex = semesters.findIndex((semester) => semester.id === semesterId);
    return currentIndex >= 0 && currentIndex + 1 < semesters.length
      ? semesters[currentIndex + 1].id
      : undefined;
  }, [semesters, semesterId]);
  const { data: comparisonGrades } = useGrades(studentId || '', compare ? prevSemesterId : undefined);
  const upsert = useUpsertGrade(studentId || '', semesterId || undefined);
  const gradeMap = useMemo(() => new Map((grades || []).map((grade) => [grade.subject_id, grade])), [grades]);
  const summary = useMemo(
    () => calculateGradeSummary(subjects, gradeMap, latestValues),
    [subjects, gradeMap, latestValues],
  );
  const analysis = useMemo(() => {
    const scored = subjects
      .map((subject) => {
        const typed = latestValues[subject.id];
        const liveScore = typed === undefined || typed === '' ? undefined : Number(typed);
        const score = liveScore != null && !Number.isNaN(liveScore) ? liveScore : gradeMap.get(subject.id)?.score ?? null;
        return { subject, score: score == null ? null : Number(score) };
      })
      .filter((entry) => entry.score != null) as Array<{ subject: Subject; score: number }>;
    if (scored.length === 0) return null;

    const top = [...scored].sort((left, right) => right.score - left.score)[0];
    const bottom = [...scored].sort((left, right) => left.score - right.score)[0];
    const strengths = scored.filter((entry) => entry.score >= 90).map((entry) => entry.subject.name);
    const attention = scored.filter((entry) => entry.score < 70).map((entry) => entry.subject.name);
    return { top, bottom, strengths, attention };
  }, [subjects, gradeMap, latestValues]);

  useEffect(() => {
    (async () => {
      if (!studentId) return;
      setLoading(true);
      try {
        const [s, sems] = await Promise.all([getStudent(studentId), listSemesters()]);
        setSemesters(sems);
        const lastSemesterId = safeGetLocal('lastSemesterId');
        const sid = (lastSemesterId && sems.find((semester) => semester.id === lastSemesterId)?.id) || sems[0]?.id || '';
        setSemesterId((prev) => prev || sid);
        setStudentName(s.name);
        const subjs = await listSubjects(s.class_id);
        setSubjects(subjs);
        setClassIdFromStudent(s.class_id);
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  const handleUpsert = async (args: { gradeId?: string; subject_id: string; score: number }) => {
    if (!studentId || !semesterId) return;
    await upsert.mutateAsync({
      gradeId: args.gradeId,
      student_id: studentId,
      subject_id: args.subject_id,
      semester_id: semesterId,
      score: args.score,
    });
  };

  if (!studentId) return <div>잘못된 접근입니다.</div>;
  if (loading) return <div>불러오는 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-sm text-gray-600 hover:text-gray-900"
          onClick={() => navigate('/students')}
        >
          ← 목록
        </button>
        <h1 className="text-xl font-semibold">성적 관리</h1>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600">학기</label>
          <select
            className="border p-1"
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
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded text-sm border"
            onClick={() => setShowGradeUpload(true)}
          >
            엑셀로 성적 등록
          </button>
          <button
            className="px-3 py-1 rounded text-sm border"
            onClick={async () =>
              await exportGradesToExcel(subjects, grades || [], studentName || '학생')
            }
          >
            Excel 내보내기
          </button>
          <button
            className="px-3 py-1 rounded text-sm border"
            onClick={async () =>
              await exportGradesToPDF(subjects, grades || [], studentName || '학생')
            }
          >
            PDF 내보내기
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <OverviewCard title="총점" value={summary.total != null ? summary.total.toFixed(1) : '-'} />
        <OverviewCard title="평균" value={summary.average != null ? summary.average.toFixed(1) : '-'} />
        <OverviewCard title="입력 과목 수" value={summary.filledCount} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard title="최고 과목" value={analysis ? `${analysis.top.subject.name} ${analysis.top.score.toFixed(0)}` : '-'} />
        <OverviewCard title="보완 과목" value={analysis ? `${analysis.bottom.subject.name} ${analysis.bottom.score.toFixed(0)}` : '-'} />
        <OverviewCard title="우수 과목" value={analysis?.strengths.length ? analysis.strengths.join(', ') : '-'} />
        <OverviewCard title="집중 관리" value={analysis?.attention.length ? analysis.attention.join(', ') : '-'} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('table')}
          className={`px-4 py-1 rounded text-sm ${tab === 'table' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          성적표
        </button>
        <button
          onClick={() => setTab('chart')}
          className={`px-4 py-1 rounded text-sm ${tab === 'chart' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          레이더 차트
        </button>
      </div>

      {tab === 'table' ? (
        <GradeTable
          subjects={subjects}
          grades={grades || []}
          semesterId={semesterId}
          studentId={studentId}
          onUpsert={handleUpsert}
          onValuesChange={setLatestValues}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-sm text-gray-700 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                disabled={!prevSemesterId}
              />
              이전 학기와 비교
            </label>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded text-sm border"
                onClick={async () => await exportRadarChartToPNG(chartRef.current, studentName || '학생')}
              >
                PNG로 내보내기
              </button>
              <button
                className="px-3 py-1 rounded text-sm border"
                onClick={async () => await exportGradesToPDF(subjects, grades || [], studentName || '학생')}
              >
                PDF로 내보내기
              </button>
            </div>
          </div>
          <div ref={chartRef} className="rounded border bg-white p-3">
            <GradeRadarChart
              subjects={subjects}
              grades={grades || []}
              overrideScores={Object.fromEntries(
                Object.entries(latestValues)
                  .map(([sid, v]) => [sid, v === '' ? undefined : Number(v)])
                  .filter(([, n]) => typeof n === 'number' && !Number.isNaN(n as number) && (n as number) >= 0 && (n as number) <= 100) as [string, number][]
              )}
              comparisonGrades={compare ? comparisonGrades || [] : undefined}
            />
          </div>
        </div>
      )}
      {showGradeUpload && classIdFromStudent && semesterId && (
        <GradeExcelUploadModal
          classId={classIdFromStudent}
          semesterId={semesterId}
          onClose={() => setShowGradeUpload(false)}
        />
      )}
    </div>
  );
}

function OverviewCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded border p-3">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function safeGetLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}
