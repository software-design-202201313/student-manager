import apiClient from './client';
import type { Counseling } from '../types';

export async function listCounselings(params?: {
  student_id?: string;
  student_name?: string;
  teacher_name?: string;
  start_date?: string;
  end_date?: string;
  include_shared?: boolean;
}): Promise<Counseling[]> {
  const { data } = await apiClient.get<Counseling[]>('/counselings', {
    params: params ?? {},
  });
  return data;
}

export async function createCounseling(body: {
  student_id: string;
  date: string;
  content: string;
  next_plan: string;
  is_shared: boolean;
}): Promise<Counseling> {
  const { data } = await apiClient.post<Counseling>('/counselings', body);
  return data;
}

export async function updateCounseling(
  id: string,
  body: {
    student_id: string;
    date: string;
    content: string;
    next_plan: string;
    is_shared: boolean;
  },
): Promise<Counseling> {
  const { data } = await apiClient.put<Counseling>(`/counselings/${id}`, body);
  return data;
}

export async function deleteCounseling(id: string): Promise<void> {
  await apiClient.delete(`/counselings/${id}`);
}
