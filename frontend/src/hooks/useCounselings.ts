import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCounseling, listCounselings, updateCounseling, deleteCounseling } from '../api/counselings';
import type { Counseling } from '../types';

const KEY = (studentId?: string) => ['counselings', studentId];

export function useCounselings(studentId?: string) {
  return useQuery<Counseling[]>({
    queryKey: KEY(studentId),
    queryFn: () => listCounselings(studentId),
  });
}

export function useCreateCounseling(studentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCounseling,
    // Invalidate all counseling queries so every consumer stays fresh
    onSuccess: () => qc.invalidateQueries({ queryKey: ['counselings'] }),
  });
}

export function useUpdateCounseling(studentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateCounseling>[1] }) =>
      updateCounseling(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['counselings'] }),
  });
}

export function useDeleteCounseling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCounseling(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['counselings'] }),
  });
}
