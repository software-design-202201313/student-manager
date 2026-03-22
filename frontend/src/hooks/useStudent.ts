import { useQuery } from '@tanstack/react-query';
import { getStudent } from '../api/students';
import type { StudentDetail } from '../types';

export function useStudent(studentId: string) {
  return useQuery<StudentDetail>({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId),
    enabled: !!studentId,
  });
}

