import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStudent } from '../api/students';
import { uploadGradesXlsx, uploadStudentsXlsx } from '../api/imports';

type StudentCsvRow = {
  name: string;
  student_number: number;
  birth_date?: string;
  gender?: string;
  phone?: string;
  address?: string;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

async function parseStudentCsv(file: Blob): Promise<StudentCsvRow[]> {
  const text = (await file.text()).replace(/^\uFEFF/, '');
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const indexOf = (name: string) => headers.findIndex((header) => header === name);
  const requiredName = indexOf('name');
  const requiredNumber = indexOf('student_number');

  if (requiredName < 0 || requiredNumber < 0) {
    throw new Error('CSV 헤더는 최소한 name, student_number 를 포함해야 합니다.');
  }

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return {
      name: cells[requiredName] ?? '',
      student_number: Number(cells[requiredNumber] ?? ''),
      birth_date: cells[indexOf('birth_date')] || undefined,
      gender: cells[indexOf('gender')] || undefined,
      phone: cells[indexOf('phone')] || undefined,
      address: cells[indexOf('address')] || undefined,
    };
  });
}

export function useUploadStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { classId: string; file: Blob }) => {
      const rows = await parseStudentCsv(args.file);
      let created = 0;
      let skipped = 0;
      const errors: Array<{ row: number; error: string }> = [];

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        if (!row.name || Number.isNaN(row.student_number) || row.student_number <= 0) {
          skipped += 1;
          errors.push({ row: index + 2, error: 'name과 student_number는 필수입니다.' });
          continue;
        }

        try {
          await createStudent(args.classId, row);
          created += 1;
        } catch (error: any) {
          skipped += 1;
          errors.push({
            row: index + 2,
            error: error?.response?.data?.detail || '학생 등록 중 오류가 발생했습니다.',
          });
        }
      }

      return { created, skipped, errors };
    },
    onSuccess: (_data, variables) => {
      // Invalidate students list for this class
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
    onSuccess: (_data, variables) => {
      // No specific cache key here; pages should refetch grades if necessary
      qc.invalidateQueries();
    },
  });
}
