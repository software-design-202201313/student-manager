import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGrade, listGrades, updateGrade } from '../api/grades';
import type { GradeItem } from '../types';

export function useGrades(studentId: string, semesterId?: string, options?: { enabled?: boolean }) {
  return useQuery<GradeItem[]>({
    queryKey: ['grades', { studentId, semesterId }],
    queryFn: () => listGrades(studentId, semesterId),
    enabled: options?.enabled ?? !!studentId,
  });
}

export function useUpsertGrade(studentId: string, semesterId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { gradeId?: string; student_id: string; subject_id: string; semester_id: string; score: number }) => {
      if (input.gradeId) {
        const { gradeId, ...payload } = input;
        return updateGrade(gradeId, payload);
      }
      return createGrade(input as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades', { studentId, semesterId }] });
    },
  });
}
