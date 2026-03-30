import type { GradeItem, Subject } from '../types';

export function getScoreValidationMessage(value: string): string | null {
  if (value.trim() === '') return null;

  const score = Number(value);
  if (Number.isNaN(score)) return '점수는 숫자로 입력해야 합니다.';
  if (score < 0 || score > 100) return '점수는 0에서 100 사이여야 합니다.';

  return null;
}

export function calculateGradeSummary(
  subjects: Subject[],
  gradeMap: Map<string, GradeItem>,
  latestValues: Record<string, string>,
) {
  let total = 0;
  let count = 0;

  for (const subject of subjects) {
    const raw = latestValues[subject.id];

    if (raw != null && raw !== '') {
      const message = getScoreValidationMessage(raw);
      if (!message) {
        total += Number(raw);
        count += 1;
      }
      continue;
    }

    const grade = gradeMap.get(subject.id);
    if (grade?.score != null) {
      total += Number(grade.score);
      count += 1;
    }
  }

  return {
    total: count > 0 ? Math.round(total * 10) / 10 : null,
    average: count > 0 ? Math.round((total / count) * 10) / 10 : null,
    filledCount: count,
  };
}
