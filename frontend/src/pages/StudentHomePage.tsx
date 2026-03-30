import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listSemesters } from '../api/semesters';
import { getMyGradeSummary, listMyFeedbacks, listMyGrades, listMySubjects, getMyStudents, getMyAttendanceSummary } from '../api/my';
import type { GradeItem, Subject, Feedback, Semester, StudentSummary } from '../types';
import { exportGradesToPDF, exportRadarChartToPNG } from '../utils/exportHelpers';
import GradeRadarChart from '../components/grades/RadarChart';

export default function StudentHomePage() {
  const user = useAuthStore((s) => s.user);
  const chartRef = useRef<HTMLDivElement | null>(null);

  // Resolve my student id
  const { data: myStudents } = useQuery({ queryKey: ['my', 'students'], queryFn: getMyStudents });
  const myStudent: StudentSummary | undefined = (myStudents ?? [])[0];

  // Semesters
  const { data: semesters } = useQuery({ queryKey: ['semesters'], queryFn: listSemesters });
  const [semesterId, setSemesterId] = useState<string>('');
  useEffect(() => {
    if (!semesterId && semesters && semesters.length > 0) {
      setSemesterId(semesters[0].id);
    }
  }, [semesters, semesterId]);

  // Subjects for my class (read-only)
  const { data: subjects } = useQuery({
    queryKey: ['my', 'subjects'],
    queryFn: () => listMySubjects(),
    enabled: !!myStudent,
  });

  // Grades & summary
  const gradesQueryKey = useMemo(() => ['my', 'grades', { semesterId }], [semesterId]);
  const { data: grades } = useQuery({
    queryKey: gradesQueryKey,
    queryFn: () => listMyGrades({ semester_id: semesterId || undefined }),
    enabled: !!semesterId,
  });
  const { data: summary } = useQuery({
    queryKey: ['my', 'grades', 'summary', { semesterId }],
    queryFn: () => getMyGradeSummary({ semester_id: semesterId || undefined }),
    enabled: !!semesterId,
  });

  // Previous semester comparison
  const prevSemesterId = useMemo(() => {
    if (!semesters || !semesterId) return undefined;
    const idx = semesters.findIndex((s) => s.id === semesterId);
    return idx >= 0 && idx + 1 < semesters.length ? semesters[idx + 1].id : undefined;
  }, [semesters, semesterId]);
  const [compare, setCompare] = useState(false);
  const { data: prevGrades } = useQuery({
    queryKey: ['my', 'grades', { semesterId: prevSemesterId }],
    queryFn: () => listMyGrades({ semester_id: prevSemesterId }),
    enabled: !!prevSemesterId && compare,
  });

  // Feedbacks (latest 5)
  const { data: feedbacks } = useQuery({
    queryKey: ['my', 'feedbacks'],
    queryFn: () => listMyFeedbacks(),
  });

  // Attendance summary (last 30 days)
  const { data: attendance } = useQuery({
    queryKey: ['my', 'attendance', 'summary'],
    queryFn: () => getMyAttendanceSummary(),
  });

  const subjectMap = useMemo(() => {
    const map: Record<string, Subject> = {};
    (subjects ?? []).forEach((s) => (map[s.id] = s));
    return map;
  }, [subjects]);

  const highsLows = useMemo(() => {
    const list = (grades ?? []).filter((g) => g.score != null) as Required<Pick<GradeItem, 'subject_id' | 'score'>>[];
    if (list.length === 0) return null;
    let hi = list[0];
    let lo = list[0];
    for (const g of list) {
      if ((g.score as number) > (hi.score as number)) hi = g as any;
      if ((g.score as number) < (lo.score as number)) lo = g as any;
    }
    return { hi, lo };
  }, [grades]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">학생 대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">내 정보</div>
          <div className="mt-1">이름: {user?.name}</div>
          <div className="mt-1">이메일: {user?.email}</div>
          <div className="mt-1">역할: {user?.role}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">학기 선택</div>
          <select className="mt-1 border rounded p-1 w-full" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
            {(semesters ?? []).map((s: Semester) => (
              <option key={s.id} value={s.id}>
                {s.year}학년도 {s.term}학기
              </option>
            ))}
          </select>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">알림</div>
          <p className="mt-1 text-gray-700">수업 및 성적 관련 알림을 확인하세요.</p>
          <Link className="inline-block mt-2 text-blue-600 underline" to="/notifications">알림 보러가기</Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <OverviewCard title="총점" value={summary?.total_score != null ? summary?.total_score.toFixed(1) : '-'} />
        <OverviewCard title="평균" value={summary?.average_score != null ? summary?.average_score.toFixed(1) : '-'} />
        <OverviewCard title="과목 수" value={summary?.subject_count ?? 0} />
        <OverviewCard
          title="최고/최저"
          value={
            highsLows
              ? `${subjectMap[highsLows.hi.subject_id]?.name ?? highsLows.hi.subject_id} ${Number(highsLows.hi.score).toFixed(0)} / ` +
                `${subjectMap[highsLows.lo.subject_id]?.name ?? highsLows.lo.subject_id} ${Number(highsLows.lo.score).toFixed(0)}`
              : '-'
          }
        />
      </div>

      {/* Radar Chart */}
      <div className="border rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">레이더 차트</div>
          <label className="text-sm text-gray-700 inline-flex items-center gap-2">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> 이전 학기와 비교
          </label>
        </div>
        <div ref={chartRef}>
          <GradeRadarChart subjects={subjects ?? []} grades={grades ?? []} comparisonGrades={compare ? (prevGrades ?? []) : undefined} />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button
            className="px-3 py-1 text-sm border rounded"
            onClick={async () => {
              const studentName = user?.name || '학생';
              await exportRadarChartToPNG(chartRef.current, studentName);
            }}
          >
            PNG로 내보내기
          </button>
          <button
            className="px-3 py-1 text-sm border rounded"
            onClick={async () => {
              const studentName = user?.name || '학생';
              await exportGradesToPDF(subjects ?? [], grades ?? [], studentName);
            }}
          >
            PDF로 내보내기
          </button>
        </div>
      </div>

      {/* Subject Table */}
      <div className="border rounded p-3">
        <div className="font-medium mb-2">과목별 성적</div>
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border">과목</th>
                <th className="p-2 border">점수</th>
                <th className="p-2 border">등급</th>
              </tr>
            </thead>
            <tbody>
              {(grades ?? []).map((g) => (
                <tr key={g.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 border">{subjectMap[g.subject_id]?.name ?? g.subject_id}</td>
                  <td className="p-2 border text-center">{g.score == null ? '-' : Number(g.score).toFixed(0)}</td>
                  <td className="p-2 border text-center">{g.grade_rank == null ? '-' : `${g.grade_rank}등급`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedbacks */}
      <div className="border rounded p-3">
        <div className="font-medium mb-2">공개된 피드백</div>
        {!feedbacks || feedbacks.length === 0 ? (
          <div className="text-gray-500 text-sm">표시할 피드백이 없습니다.</div>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-auto">
            {feedbacks.map((fb: Feedback) => (
              <li key={fb.id} className="border rounded p-2">
                <div className="text-xs text-gray-500">{new Date(fb.created_at).toLocaleString()} · {LABELS[fb.category] || fb.category}</div>
                <div className="mt-1">{fb.content}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Attendance Summary */}
      <div className="border rounded p-3">
        <div className="font-medium mb-2">출결 요약 (최근 30일)</div>
        {!attendance ? (
          <div className="text-gray-500 text-sm">출결 요약을 불러오는 중...</div>
        ) : (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="px-2 py-1 border rounded">출석 {attendance.present}</span>
            <span className="px-2 py-1 border rounded">결석 {attendance.absent}</span>
            <span className="px-2 py-1 border rounded">지각 {attendance.late}</span>
            <span className="px-2 py-1 border rounded">조퇴 {attendance.early_leave}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="border rounded p-3">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  grade: '성적',
  score: '성적',
  behavior: '행동',
  attendance: '출결',
  attitude: '태도',
};
