import { useEffect, useMemo, useState } from 'react';
import type { GradeItem, Subject } from '../../types';
import { calculateGrade } from '../../utils/gradeCalculator';

type Props = {
  subjects: Subject[];
  grades: GradeItem[];
  semesterId: string;
  studentId: string;
  onUpsert: (args: { gradeId?: string; subject_id: string; score: number }) => Promise<void>;
};

export default function GradeTable({ subjects, grades, semesterId, studentId, onUpsert }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});

  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.subject_id, g])), [grades]);

  useEffect(() => {
    const init: Record<string, string> = {};
    subjects.forEach((s) => {
      const g = gradeMap.get(s.id);
      init[s.id] = g?.score != null ? String(g.score) : '';
    });
    setValues(init);
  }, [subjects, gradeMap]);

  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-50">
        <tr>
          <th className="p-2 border">과목</th>
          <th className="p-2 border">점수</th>
          <th className="p-2 border">등급</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((s) => {
          const g = gradeMap.get(s.id);
          const scoreNum = values[s.id] ? Number(values[s.id]) : undefined;
          const rank = scoreNum != null && !Number.isNaN(scoreNum) ? calculateGrade(scoreNum) : g?.grade_rank ?? null;
          return (
            <tr key={s.id} className="border-b">
              <td className="p-2 border">{s.name}</td>
              <td className="p-2 border">
                <input
                  className="border p-1 w-24"
                  value={values[s.id] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  onBlur={async () => {
                    const v = values[s.id];
                    if (v === '') return;
                    const num = Number(v);
                    if (Number.isNaN(num) || num < 0 || num > 100) return;
                    await onUpsert({ gradeId: g?.id, subject_id: s.id, score: num });
                  }}
                />
              </td>
              <td className="p-2 border w-24 text-center">{rank ?? '-'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

