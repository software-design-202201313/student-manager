import * as XLSX from 'xlsx';

export type BulkInviteRow = {
  id: string;
  rowNumber: number;
  name: string;
  email: string;
  student_number: number | null;
  birth_date?: string;
  status: 'valid' | 'invalid' | 'creating' | 'created' | 'failed';
  issues: string[];
  invite_url?: string;
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function pickValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const matched = Object.entries(row).find(([header]) => normalizeHeader(header) === key);
    if (matched) return matched[1]?.trim() ?? '';
  }
  return '';
}

function parseDelimitedText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [] as Record<string, string>[];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((value) => value.trim());
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

export function validateBulkInviteRows(rows: Array<Omit<BulkInviteRow, 'status' | 'issues'>>) {
  const emailCounts = new Map<string, number>();
  const studentNumberCounts = new Map<number, number>();

  for (const row of rows) {
    if (row.email) emailCounts.set(row.email, (emailCounts.get(row.email) ?? 0) + 1);
    if (row.student_number != null) studentNumberCounts.set(row.student_number, (studentNumberCounts.get(row.student_number) ?? 0) + 1);
  }

  return rows.map<BulkInviteRow>((row) => {
    const issues: string[] = [];

    if (!row.name) issues.push('이름 누락');
    if (!row.email) issues.push('이메일 누락');
    if (row.student_number == null || Number.isNaN(row.student_number)) {
      issues.push('번호 누락');
    } else if (row.student_number < 1 || row.student_number > 100) {
      issues.push('번호 범위 오류');
    }

    if (row.email && (emailCounts.get(row.email) ?? 0) > 1) {
      issues.push('중복 이메일');
    }
    if (row.student_number != null && (studentNumberCounts.get(row.student_number) ?? 0) > 1) {
      issues.push('중복 번호');
    }

    return {
      ...row,
      status: issues.length === 0 ? 'valid' : 'invalid',
      issues,
    };
  });
}

export function parseBulkInviteText(text: string) {
  const rawRows = parseDelimitedText(text);
  const rows = rawRows.map((row, index) => ({
    id: `row-${index + 1}`,
    rowNumber: index + 2,
    name: pickValue(row, ['name', '이름']),
    email: pickValue(row, ['email', '이메일']),
    student_number: Number(pickValue(row, ['student_number', '번호'])) || null,
    birth_date: pickValue(row, ['birth_date', '생년월일']) || undefined,
  }));
  return validateBulkInviteRows(rows);
}

export async function parseBulkInviteFile(file: File) {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet, { defval: '' });
    const rows = jsonRows.map((row, index) => ({
      id: `row-${index + 1}`,
      rowNumber: index + 2,
      name: String(row['이름'] || row['name'] || '').trim(),
      email: String(row['이메일'] || row['email'] || '').trim(),
      student_number: Number(row['번호'] || row['student_number'] || 0) || null,
      birth_date: String(row['생년월일'] || row['birth_date'] || '').trim() || undefined,
    }));
    return validateBulkInviteRows(rows);
  }

  const text = await file.text();
  return parseBulkInviteText(text);
}
