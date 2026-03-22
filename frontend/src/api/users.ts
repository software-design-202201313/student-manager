import apiClient from './client';
import type { StudentSummary } from '../types';

export async function listStudents(classId?: string): Promise<StudentSummary[]> {
  const { data } = await apiClient.get<StudentSummary[]>(
    '/users/students',
    { params: { class_id: classId } },
  );
  return data;
}

