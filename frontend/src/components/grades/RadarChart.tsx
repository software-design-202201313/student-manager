import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { GradeItem, Subject } from '../../types';

interface GradeRadarChartProps {
  subjects: Subject[];
  grades: GradeItem[];
  // Optional overrides from in-progress edits. Keyed by subject_id.
  overrideScores?: Record<string, number>;
  // Optional comparison dataset (e.g., previous semester)
  comparisonGrades?: GradeItem[];
}

export default function GradeRadarChart({ subjects, grades, overrideScores, comparisonGrades }: GradeRadarChartProps) {
  const gradeMap = new Map(grades.map((g) => [g.subject_id, g.score ?? 0]));
  const compMap = new Map((comparisonGrades ?? []).map((g) => [g.subject_id, g.score ?? 0]));

  // Prefer explicit subjects; if absent, derive from grades
  const baseSubjects: { id: string; name: string }[] =
    subjects && subjects.length > 0
      ? subjects.map((s) => ({ id: s.id, name: s.name }))
      : Array.from(
          new Map(
            grades.map((g) => [g.subject_id, { id: g.subject_id, name: g.subject_name || g.subject_id }])
          ).values()
        );

  const data = baseSubjects.map((s) => {
    const override = overrideScores?.[s.id];
    const score = typeof override === 'number' ? override : (gradeMap.get(s.id) ?? 0);
    const base: any = { subject: s.name, score };
    if (comparisonGrades) base.scorePrev = compMap.get(s.id) ?? 0;
    return base;
  });

  if (data.length === 0) return <p className="text-gray-500 text-sm">과목 데이터가 없습니다.</p>;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsRadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={6} />
        <Radar name="점수" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
        {comparisonGrades && (
          <Radar name="이전 학기" dataKey="scorePrev" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
        )}
        <Tooltip />
        <Legend />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
