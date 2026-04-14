import apiClient from './client';
import type { Semester } from '../types';

export async function listSemesters(): Promise<Semester[]> {
  const { data } = await apiClient.get<Semester[]>('/semesters');
  return data;
}

export async function createSemester(body: { year: number; term: number }): Promise<Semester> {
  const { data } = await apiClient.post<Semester>('/semesters', body);
  return data;
}

