const GRADE_CUTOFFS = [96, 89, 77, 60, 40, 23, 11, 4];

export function calculateGrade(score: number): number {
  for (let rank = 0; rank < GRADE_CUTOFFS.length; rank++) {
    if (score >= GRADE_CUTOFFS[rank]) return rank + 1;
  }
  return 9;
}

