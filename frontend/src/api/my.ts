import apiClient from './client';
import type { GradeItem, Feedback, StudentSummary, Subject } from '../types';

export interface GradeSummary {
  total_score: number | null;
  average_score: number | null;
  subject_count: number;
  grades: GradeItem[];
}

export async function getMyStudents(): Promise<StudentSummary[]> {
  const { data } = await apiClient.get<StudentSummary[]>('/my/students');
  return data;
}

export async function listMyGrades(params?: { student_id?: string; semester_id?: string }): Promise<GradeItem[]> {
  const { data } = await apiClient.get<GradeItem[]>('/my/grades', { params });
  // Normalize score from Decimal to number
  return data.map((g) => ({ ...g, score: g.score === null ? null : Number(g.score) }));
}

export async function getMyGradeSummary(params?: { student_id?: string; semester_id?: string }): Promise<GradeSummary> {
  const { data } = await apiClient.get<GradeSummary>('/my/grades/summary', { params });
  return {
    ...data,
    grades: data.grades.map((g) => ({ ...g, score: g.score === null ? null : Number(g.score) })),
  };
}

export async function listMySubjects(params?: { student_id?: string }): Promise<Subject[]> {
  const { data } = await apiClient.get<Subject[]>('/my/subjects', { params });
  return data;
}

export async function listMyFeedbacks(params?: { student_id?: string; limit?: number }): Promise<Feedback[]> {
  const { data } = await apiClient.get<Feedback[]>('/my/feedbacks', { params });
  return data;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  early_leave: number;
  start_date: string;
  end_date: string;
  series: { date: string; count: number }[];
}

export async function getMyAttendanceSummary(params?: { student_id?: string; start_date?: string; end_date?: string }): Promise<AttendanceSummary> {
  const { data } = await apiClient.get<AttendanceSummary>('/my/attendance/summary', { params });
  return data;
}
