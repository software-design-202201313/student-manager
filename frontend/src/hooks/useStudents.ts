import { useQuery } from '@tanstack/react-query';
import { listStudents } from '../api/users';
import type { StudentSummary } from '../types';

export function useStudents(classId?: string) {
  return useQuery<StudentSummary[]>({
    queryKey: ['students', { classId }],
    queryFn: () => listStudents(classId),
  });
}

