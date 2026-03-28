import { useEffect, useMemo, useState } from 'react';
import type { GradeItem, Subject } from '../../types';
import { calculateGrade } from '../../utils/gradeCalculator';

type Props = {
  subjects: Subject[];
  grades: GradeItem[];
  semesterId: string;
  studentId: string;
  onUpsert: (args: { gradeId?: string; subject_id: string; score: number }) => Promise<void>;
  // Notify parent about local edits to reflect on charts, etc.
  onValuesChange?: (values: Record<string, string>) => void;
};

export default function GradeTable({ subjects, grades, semesterId, studentId, onUpsert, onValuesChange }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.subject_id, g])), [grades]);

  useEffect(() => {
    const init: Record<string, string> = {};
    subjects.forEach((s) => {
      const g = gradeMap.get(s.id);
      init[s.id] = g?.score != null ? String(g.score) : '';
    });
    setValues(init);
  }, [subjects, gradeMap]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  const dirtySubjectIds = useMemo(() => {
    return subjects
      .map((s) => {
        const g = gradeMap.get(s.id);
        const cur = values[s.id] ?? '';
        const curNum = cur === '' ? null : Number(cur);
        const isNum = cur !== '' && !Number.isNaN(curNum) && curNum >= 0 && curNum <= 100;
        const prevNum = g?.score ?? null;
        // Changed if: valid number and different from previous OR previous had a number and now empty (treat as no change for now)
        if (isNum && prevNum !== curNum) return s.id;
        return null;
      })
      .filter((x): x is string => !!x);
  }, [subjects, gradeMap, values]);

  const hasInvalid = useMemo(() => {
    return subjects.some((s) => {
      const v = values[s.id];
      if (v == null || v === '') return false; // empty is allowed (no change)
      const num = Number(v);
      return Number.isNaN(num) || num < 0 || num > 100;
    });
  }, [subjects, values]);

  const handleSaveAll = async () => {
    if (saving || hasInvalid || dirtySubjectIds.length === 0) return;
    setSaving(true);
    try {
      for (const sid of dirtySubjectIds) {
        const g = gradeMap.get(sid);
        const v = values[sid];
        const num = Number(v);
        await onUpsert({ gradeId: g?.id, subject_id: sid, score: num });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          className={`px-3 py-1 rounded text-sm border ${
            hasInvalid || dirtySubjectIds.length === 0 || saving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleSaveAll}
          disabled={hasInvalid || dirtySubjectIds.length === 0 || saving}
        >
          {saving ? '저장 중...' : '성적 저장'}
        </button>
      </div>
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
                  />
                </td>
                <td className="p-2 border w-24 text-center">{rank ?? '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
