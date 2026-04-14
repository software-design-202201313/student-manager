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
  
  useEffect(() => {
    setLatestValues({});
  }, [semesterId, studentId]);

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NumberCard title="총점" value={summary.total != null ? summary.total.toFixed(1) : '-'} />
        <NumberCard title="평균" value={summary.average != null ? summary.average.toFixed(1) : '-'} />
        <NumberCard title="입력 과목 수" value={summary.filledCount} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SubjectScoreCard 
          title="최고 과목" 
          subjectName={analysis?.top.subject.name || '-'} 
          score={analysis?.top.score != null ? analysis.top.score.toFixed(0) : '-'} 
          type="top" 
        />
        <SubjectScoreCard 
          title="보완 과목" 
          subjectName={analysis?.bottom.subject.name || '-'} 
          score={analysis?.bottom.score != null ? analysis.bottom.score.toFixed(0) : '-'} 
          type="bottom" 
        />
        <SubjectListCard 
          title="우수 과목" 
          subjects={analysis?.strengths || []} 
          type="good" 
        />
        <SubjectListCard 
          title="집중 관리" 
          subjects={analysis?.attention || []} 
          type="bad" 
        />
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

function NumberCard({ title, value }: { title: string; value: string | number }) {
  const strVal = String(value);
  const parts = strVal.split('.');
  const hasDecimal = parts.length > 1 && parts[1] !== undefined;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl opacity-80" />
      <div className="text-sm font-medium text-gray-500 mb-2 pl-2">{title}</div>
      <div className="text-3xl font-bold text-gray-900 tracking-tight pl-2">
        {parts[0]}
        {hasDecimal && <span className="text-xl text-gray-400 font-medium tracking-normal">.{parts[1]}</span>}
      </div>
    </div>
  );
}

function SubjectScoreCard({ title, subjectName, score, type }: { title: string; subjectName: string; score: number | string; type?: 'top' | 'bottom' }) {
  const isTop = type === 'top';
  
  if (!subjectName || subjectName === '-') {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm h-full flex flex-col justify-between group">
        <div className="text-sm font-medium text-gray-500">{title}</div>
        <div className="mt-2 text-xl font-semibold text-gray-300">-</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-transform hover:-translate-y-1 h-full flex flex-col justify-between group">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-5 flex items-end justify-between">
        <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-bold ${isTop ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>
          {subjectName}
        </span>
        <div className="text-3xl font-bold tracking-tight text-gray-900">
          {score}
          <span className="text-sm font-medium text-gray-400 ml-1 tracking-normal">점</span>
        </div>
      </div>
    </div>
  );
}

function SubjectListCard({ title, subjects, type }: { title: string; subjects: string[]; type?: 'good' | 'bad' }) {
  const isGood = type === 'good';
  
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col group">
      <div className="text-sm font-medium text-gray-500 mb-4">{title}</div>
      {subjects.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-auto">
          {subjects.map((sub) => (
            <span key={sub} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${isGood ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
              {sub}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-auto text-sm text-gray-300 font-medium">-</div>
      )}
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
