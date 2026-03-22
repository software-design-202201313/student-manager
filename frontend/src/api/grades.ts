import apiClient from './client';
import type { GradeItem } from '../types';

export async function listGrades(studentId: string, semesterId?: string): Promise<GradeItem[]> {
  const { data } = await apiClient.get<GradeItem[]>(`/grades`, { params: { student_id: studentId, semester_id: semesterId } });
  return data;
}

export async function createGrade(body: { student_id: string; subject_id: string; semester_id: string; score: number }): Promise<GradeItem> {
  const { data } = await apiClient.post<GradeItem>(`/grades`, body);
  return data;
}

export async function updateGrade(gradeId: string, body: { student_id: string; subject_id: string; semester_id: string; score: number }): Promise<GradeItem> {
  const { data } = await apiClient.put<GradeItem>(`/grades/${gradeId}`, body);
  return data;
}

