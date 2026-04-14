import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listSemesters } from '../api/semesters';
import { listSubjects } from '../api/classes';
import { getMyGradeSummary, listMyFeedbacks, listMyGrades, listMySubjects, getMyStudents, getMyAttendanceSummary } from '../api/my';
import type { GradeItem, Subject, Feedback, Semester, StudentSummary } from '../types';
import { exportGradesToPDF, exportRadarChartToPNG } from '../utils/exportHelpers';
import GradeRadarChart from '../components/grades/RadarChart';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

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
  const { data: subjects, isFetched: isMySubjectsFetched } = useQuery({
    queryKey: ['my', 'subjects'],
    queryFn: () => listMySubjects(),
    enabled: !!myStudent,
  });
  // Fallback: if my-subjects is empty (or undefined) but 학생의 class가 있으면 class 과목 목록을 조회
  const { data: classSubjects } = useQuery<Subject[]>({
    queryKey: ['class-subjects', myStudent?.class_id],
    queryFn: () => listSubjects(myStudent!.class_id),
    enabled: !!myStudent && isMySubjectsFetched && (!subjects || subjects.length === 0),
  });
  const subjectsForDisplay: Subject[] = useMemo(() => (subjects && subjects.length > 0 ? subjects : (classSubjects ?? [])), [subjects, classSubjects]);

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

  // Attendance summary for selected month
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const monthStart = useMemo(() => firstDayOfMonth(calMonth), [calMonth]);
  const monthEnd = useMemo(() => lastDayOfMonth(calMonth), [calMonth]);
  const { data: attendance } = useQuery({
    queryKey: ['my', 'attendance', 'summary', { monthStart, monthEnd }],
    queryFn: () => getMyAttendanceSummary({ start_date: monthStart, end_date: monthEnd }),
  });

  const subjectMap = useMemo(() => {
    const map: Record<string, Subject> = {};
    (subjectsForDisplay ?? []).forEach((s) => (map[s.id] = s));
    // also patch from grades if API included subject_name
    (grades ?? []).forEach((g) => {
      if (g.subject_name && !map[g.subject_id]) {
        map[g.subject_id] = { id: g.subject_id, class_id: myStudent?.class_id || '', name: g.subject_name } as Subject;
      }
    });
    return map;
  }, [subjectsForDisplay, grades, myStudent?.class_id]);

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
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">학생 대시보드</h1>
        <p className="text-sm text-gray-600">학기별 성적, 공개된 피드백, 출결 요약을 확인하세요.</p>
      </header>

      {/* Header / Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">내 정보</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="text-lg font-semibold">{user?.name}</div>
            {user?.role && (
              <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${roleTagClass(user?.role)}`}>
                <span aria-hidden="true">{roleEmoji(user?.role)}</span>
                <span>{roleLabel(user?.role)}</span>
              </span>
            )}
          </div>
          <div className="mt-1 text-gray-700 text-sm">{user?.email}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">학기 선택</div>
          <select className="mt-1 border rounded p-2 w-full" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
            {(semesters ?? []).map((s: Semester) => (
              <option key={s.id} value={s.id}>
                {s.year}학년도 {s.term}학기
              </option>
            ))}
          </select>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">알림</div>
          <p className="mt-1 text-gray-700 text-sm">수업 및 성적 관련 알림을 확인하세요.</p>
          <Link className="inline-block mt-2 text-blue-600 underline" to="/notifications">알림 보러가기</Link>
        </div>
      </div>

      {/* Overview Cards (uniform, smaller typography) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <OverviewCard title="총점" value={summary?.total_score != null ? summary?.total_score.toFixed(1) : '-'} />
        <OverviewCard title="평균" value={summary?.average_score != null ? summary?.average_score.toFixed(1) : '-'} />
        <OverviewCard title="과목 수" value={summary?.subject_count ?? 0} />
        <OverviewCard
          title="최고"
          value={
            highsLows
              ? `${subjectMap[highsLows.hi.subject_id]?.name ?? '과목'} (${Number(highsLows.hi.score).toFixed(0)}점)`
              : '-'
          }
        />
        <OverviewCard
          title="최저"
          value={
            highsLows
              ? `${subjectMap[highsLows.lo.subject_id]?.name ?? '과목'} (${Number(highsLows.lo.score).toFixed(0)}점)`
              : '-'
          }
        />
      </div>

      {/* Dashboard Tabs */}
      <StudentDashboardTabs
        chart={
          <div className="border rounded p-3">
            <div className="flex items-center justify-end mb-2">
              <label className="text-sm text-gray-700 inline-flex items-center gap-2">
                <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> 이전 학기와 비교
              </label>
            </div>
            <div ref={chartRef}>
              <GradeRadarChart subjects={subjectsForDisplay ?? []} grades={grades ?? []} comparisonGrades={compare ? (prevGrades ?? []) : undefined} />
            </div>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
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
                  await exportGradesToPDF(subjectsForDisplay ?? [], grades ?? [], studentName);
                }}
              >
                PDF로 내보내기
              </button>
            </div>
          </div>
        }
        subjects={
          <div className="border rounded p-3">
            <div className="block md:hidden space-y-2">
              {(grades ?? []).map((g) => (
                <div key={g.id} className="border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{g.subject_name || subjectMap[g.subject_id]?.name || '과목'}</div>
                    <div className="text-sm text-gray-500">{g.grade_rank == null ? '-' : `${g.grade_rank}등급`}</div>
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{g.score == null ? '-' : Number(g.score).toFixed(0)}</div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border text-center">과목</th>
                    <th className="p-2 border">점수</th>
                    <th className="p-2 border">등급</th>
                  </tr>
                </thead>
                <tbody>
                  {(grades ?? []).map((g) => (
                    <tr key={g.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 border text-center">{g.subject_name || subjectMap[g.subject_id]?.name || '과목'}</td>
                      <td className="p-2 border text-center">{g.score == null ? '-' : Number(g.score).toFixed(0)}</td>
                      <td className="p-2 border text-center">{g.grade_rank == null ? '-' : `${g.grade_rank}등급`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        }
        feedbacks={
          <div className="border rounded p-3">
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
        }
        attendance={
          <div className="border rounded p-3">
            {!attendance ? (
              <div className="text-gray-500 text-sm">출결 요약을 불러오는 중...</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border rounded p-2 flex flex-col h-full">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie dataKey="value" data={buildAttendancePie(attendance)} cx="50%" cy="50%" outerRadius={100} label>
                            {buildAttendancePie(attendance).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-auto pt-3 flex flex-wrap justify-center gap-2 text-sm">
                      <span className="px-2 py-1 border rounded">출석 {attendance.present}</span>
                      <span className="px-2 py-1 border rounded">결석 {attendance.absent}</span>
                      <span className="px-2 py-1 border rounded">지각 {attendance.late}</span>
                      <span className="px-2 py-1 border rounded">조퇴 {attendance.early_leave}</span>
                    </div>
                  </div>
                  <div className="border rounded p-2 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{formatMonthLabel(calMonth)}</div>
                      <div className="flex gap-2">
                        <button type="button" className="px-2 py-0.5 border rounded" onClick={() => setCalMonth(addMonths(calMonth, -1))}>
                          ◀
                        </button>
                        <button type="button" className="px-2 py-0.5 border rounded" onClick={() => setCalMonth(new Date())}>
                          오늘
                        </button>
                        <button type="button" className="px-2 py-0.5 border rounded" onClick={() => setCalMonth(addMonths(calMonth, 1))}>
                          ▶
                        </button>
                      </div>
                    </div>
                    <AttendanceMonthlyCalendar
                      month={calMonth}
                      presentDates={attendance.present_dates ?? []}
                      absentDates={attendance.absent_dates ?? []}
                      lateDates={attendance.late_dates ?? []}
                      earlyLeaveDates={attendance.early_leave_dates ?? []}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}

function StudentDashboardTabs({
  chart,
  subjects,
  feedbacks,
  attendance,
}: {
  chart: ReactNode;
  subjects: ReactNode;
  feedbacks: ReactNode;
  attendance: ReactNode;
}) {
  const [tab, setTab] = useState<'chart' | 'subjects' | 'feedbacks' | 'attendance'>('chart');
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 border-b">
        {[
          { key: 'chart', label: '레이더 차트' },
          { key: 'subjects', label: '과목별 성적' },
          { key: 'feedbacks', label: '공개된 피드백' },
          { key: 'attendance', label: '출결 요약' },
        ].map((t) => (
          <button
            key={t.key}
            className={
              'px-3 py-2 text-sm border-b-2 -mb-px ' +
              (tab === (t.key as any)
                ? 'border-blue-600 text-blue-700 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300')
            }
            onClick={() => setTab(t.key as any)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'chart' && chart}
      {tab === 'subjects' && subjects}
      {tab === 'feedbacks' && feedbacks}
      {tab === 'attendance' && attendance}
    </div>
  );
}

function OverviewCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="border rounded p-3">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xl font-medium mt-1">{value}</div>
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

function roleLabel(role?: string) {
  if (!role) return '-';
  if (role === 'student') return '학생';
  if (role === 'parent') return '학부모';
  if (role === 'teacher') return '교사';
  return role;
}

function roleTagClass(role?: string) {
  switch (role) {
    case 'student':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'teacher':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'parent':
      return 'bg-green-50 text-green-700 border-green-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function roleEmoji(role?: string) {
  switch (role) {
    case 'student':
      return '🎓';
    case 'teacher':
      return '🧑‍🏫';
    case 'parent':
      return '👨‍👩‍👧‍👦';
    default:
      return '👤';
  }
}

function buildAttendancePie(att?: {
  present?: number;
  absent?: number;
  late?: number;
  early_leave?: number;
}) {
  const data = [
    { name: '출석', key: 'present', value: att?.present ?? 0, color: '#10b981' },
    { name: '결석', key: 'absent', value: att?.absent ?? 0, color: '#ef4444' },
    { name: '지각', key: 'late', value: att?.late ?? 0, color: '#f59e0b' },
    { name: '조퇴', key: 'early_leave', value: att?.early_leave ?? 0, color: '#3b82f6' },
  ];
  return data.filter((d) => d.value > 0);
}

function fmtKDate(iso: string) {
  const [y, m, d] = iso.split('-');
  const mm = Number(m);
  const dd = Number(d);
  return `${mm}월 ${dd}일`;
}

function fmtShort(iso: string) {
  const [y, m, d] = iso.split('-');
  const mm = String(Number(m));
  const dd = String(Number(d)).padStart(2, '0');
  return `${mm}/${dd}`;
}

function AttendanceDateList({ title, dates, colorClass }: { title: string; dates: string[]; colorClass: string }) {
  const [open, setOpen] = useState(false);
  const head = dates.slice(0, 3).map(fmtShort).join(', ');
  const rest = Math.max(dates.length - 3, 0);
  return (
    <div>
      <div className="font-medium mb-1 flex items-center justify-between">
        <span>{title}</span>
        {dates.length > 3 && (
          <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setOpen((v) => !v)}>
            {open ? '접기' : '더 보기'}
          </button>
        )}
      </div>
      {!open ? (
        <div className="text-gray-700">
          {dates.length === 0 ? (
            <span className="text-gray-500">없음</span>
          ) : (
            <span>
              {head}
              {rest > 0 ? ` … +${rest}` : ''}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {dates.map((d) => (
            <span key={`${title}-${d}`} className={`px-2 py-0.5 rounded ${colorClass}`}>
              {fmtKDate(d)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function firstDayOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x.toISOString().slice(0, 10);
}

function lastDayOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return x.toISOString().slice(0, 10);
}

function addMonths(d: Date, delta: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + delta);
  return x;
}

function formatMonthLabel(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

function AttendanceMonthlyCalendar({
  month,
  presentDates,
  absentDates,
  lateDates,
  earlyLeaveDates,
}: {
  month: Date;
  presentDates: string[];
  absentDates: string[];
  lateDates: string[];
  earlyLeaveDates: string[];
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  const startWeekday = start.getDay(); // 0=Sun
  const daysInMonth = end.getDate();

  const statusByDate: Record<string, string[]> = {};
  const add = (arr: string[], status: string) => {
    arr.forEach((iso) => {
      statusByDate[iso] = statusByDate[iso] || [];
      if (!statusByDate[iso].includes(status)) statusByDate[iso].push(status);
    });
  };
  add(presentDates, 'present');
  add(absentDates, 'absent');
  add(lateDates, 'late');
  add(earlyLeaveDates, 'early_leave');

  const weeks: (Date | null)[][] = [];
  let cur = 1 - startWeekday;
  for (let w = 0; w < 6; w++) {
    const row: (Date | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(year, monthIndex, cur);
      if (cur < 1 || cur > daysInMonth) row.push(null);
      else row.push(day);
      cur++;
    }
    weeks.push(row);
    if (cur > daysInMonth) break;
  }

  const dot = (status: string) => {
    const cls =
      status === 'present' ? 'bg-green-500' :
      status === 'absent' ? 'bg-red-500' :
      status === 'late' ? 'bg-amber-500' :
      'bg-blue-500';
    return <span key={status} className={`w-2 h-2 rounded-full ${cls}`}></span>;
  };

  return (
    <div className="text-xs">
      <div className="grid grid-cols-7 mb-1 text-center text-gray-600">
        {['일','월','화','수','목','금','토'].map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day, idx) => {
          if (!day) return <div key={idx} className="min-h-16 p-1 border rounded bg-gray-50"></div>;
          const iso = day.toISOString().slice(0,10);
          const statuses = statusByDate[iso] || [];
          return (
            <div key={idx} className="min-h-16 p-1 border rounded">
              <div className="text-right text-gray-700">{day.getDate()}</div>
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                {statuses.length === 0 ? <span className="w-2 h-2 rounded-full bg-gray-200"></span> : statuses.map(dot)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
