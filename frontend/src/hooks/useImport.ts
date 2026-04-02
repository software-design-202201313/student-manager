import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadGradesXlsx, uploadStudentsCsv } from '../api/imports';

export function useUploadStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { classId: string; file: Blob }) => uploadStudentsCsv(args.classId, args.file),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['students', { classId: variables.classId }] });
    },
  });
}

export function useUploadGrades() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { classId: string; semesterId: string; file: Blob }) => {
      return uploadGradesXlsx(args.classId, args.semesterId, args.file);
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
