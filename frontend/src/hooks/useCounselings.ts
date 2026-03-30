import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCounseling, listCounselings, updateCounseling, deleteCounseling } from '../api/counselings';
import type { Counseling } from '../types';

type CounselingFilters = {
  student_id?: string;
  student_name?: string;
  teacher_name?: string;
  start_date?: string;
  end_date?: string;
  include_shared?: boolean;
};

const KEY = (filters?: CounselingFilters) => ['counselings', filters];

export function useCounselings(filters?: CounselingFilters) {
  return useQuery<Counseling[]>({
    queryKey: KEY(filters),
    queryFn: () => listCounselings(filters),
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
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['counselings'] });
      const snapshots = qc.getQueriesData<Counseling[]>({ queryKey: ['counselings'] });
      // Optimistically remove from all matching caches
      qc.setQueriesData<Counseling[]>({ queryKey: ['counselings'] }, (old) =>
        Array.isArray(old) ? old.filter((c) => c.id !== id) : old,
      );
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, data] of ctx.snapshots) qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['counselings'] });
    },
  });
}
