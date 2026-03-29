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
    // Optimistically remove the deleted feedback from all feedback caches
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['feedbacks'] });
      const snapshots = qc.getQueriesData<Feedback[]>({ queryKey: ['feedbacks'] });
      // Remove from every matching cache (all students and per-student variants)
      qc.setQueriesData<Feedback[]>({ queryKey: ['feedbacks'] }, (old) =>
        Array.isArray(old) ? old.filter((f) => f.id !== id) : old,
      );
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      // Rollback on error
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      // Ensure server state is the source of truth
      qc.invalidateQueries({ queryKey: ['feedbacks'] });
    },
  });
}
