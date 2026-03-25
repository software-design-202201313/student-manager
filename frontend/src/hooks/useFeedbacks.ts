import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFeedback,
  deleteFeedback,
  listFeedbacks,
  updateFeedback,
} from '../api/feedbacks';
import type { Feedback } from '../types';

const KEY = (studentId?: string) => ['feedbacks', studentId];

export function useFeedbacks(studentId?: string) {
  return useQuery<Feedback[]>({
    queryKey: KEY(studentId),
    queryFn: () => listFeedbacks(studentId),
  });
}

export function useCreateFeedback(studentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFeedback,
    // Invalidate all feedback queries so every consumer (student detail, page-level) stays fresh
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedbacks'] }),
  });
}

export function useUpdateFeedback(studentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateFeedback>[1] }) =>
      updateFeedback(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedbacks'] }),
  });
}

export function useDeleteFeedback(studentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFeedback(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedbacks'] }),
  });
}
