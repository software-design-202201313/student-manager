import apiClient from './client';
import type { Feedback } from '../types';

export async function listFeedbacks(studentId?: string): Promise<Feedback[]> {
  const { data } = await apiClient.get<Feedback[]>('/feedbacks', {
    params: studentId ? { student_id: studentId } : {},
  });
  return data;
}

export async function createFeedback(body: {
  student_id: string;
  category: Feedback['category'];
  content: string;
  is_visible_to_student: boolean;
  is_visible_to_parent: boolean;
}): Promise<Feedback> {
  const { data } = await apiClient.post<Feedback>('/feedbacks', body);
  return data;
}

export async function updateFeedback(
  id: string,
  body: {
    student_id: string;
    category: Feedback['category'];
    content: string;
    is_visible_to_student: boolean;
    is_visible_to_parent: boolean;
  },
): Promise<Feedback> {
  const { data } = await apiClient.put<Feedback>(`/feedbacks/${id}`, body);
  return data;
}

export async function deleteFeedback(id: string): Promise<void> {
  await apiClient.delete(`/feedbacks/${id}`);
}
