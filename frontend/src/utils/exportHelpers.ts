import type { GradeItem, Subject, StudentSummary } from '../types';

// Sanitize names used in filenames to prevent path traversal / special char issues
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
}

export async function exportGradesToExcel(
  subjects: Subject[],
  grades: GradeItem[],
  studentName: string,
) {
  const XLSX = await import('xlsx');
  const gradeMap = new Map(grades.map((g) => [g.subject_id, g]));
  const rows = subjects.map((s) => {
    const g = gradeMap.get(s.id);
    return {
      과목: s.name,
      점수: g?.score ?? '',
      등급: g?.grade_rank ?? '',
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '성적');
  XLSX.writeFile(wb, `${safeName(studentName)}_성적.xlsx`);
}

export async function exportGradesToPDF(
  subjects: Subject[],
  grades: GradeItem[],
  studentName: string,
) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`${studentName} 성적표`, 14, 20);

  const gradeMap = new Map(grades.map((g) => [g.subject_id, g]));
  let y = 36;
  doc.setFontSize(11);
  subjects.forEach((s) => {
    const g = gradeMap.get(s.id);
    doc.text(`${s.name}: ${g?.score ?? '-'} (등급 ${g?.grade_rank ?? '-'})`, 14, y);
    y += 8;
  });
  doc.save(`${safeName(studentName)}_성적.pdf`);
}

export async function exportRadarChartToPNG(
  chartElement: HTMLElement | null,
  studentName: string,
) {
  if (!chartElement) return;

  const svg = chartElement.querySelector('svg');
  if (!svg) return;

  const serializer = new XMLSerializer();
  const svgMarkup = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const width = Math.max(chartElement.clientWidth || 640, 320);
    const height = Math.max(chartElement.clientHeight || 320, 240);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pngUrl = canvas.toDataURL('image/png');
    const anchor = document.createElement('a');
    anchor.href = pngUrl;
    anchor.download = `${safeName(studentName)}_레이더차트.png`;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportStudentsToExcel(students: StudentSummary[], classLabel?: string) {
  const XLSX = await import('xlsx');
  const rows = students
    .slice()
    .sort((a, b) => a.student_number - b.student_number)
    .map((s) => ({ 번호: s.student_number, 이름: s.name, 학생ID: s.id }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '학생목록');
  const filename = classLabel
    ? `${safeName(classLabel)}_학생목록.xlsx`
    : `학생목록.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportStudentsToCSV(students: StudentSummary[], classLabel?: string) {
  const rows = students
    .slice()
    .sort((a, b) => a.student_number - b.student_number)
    .map((student) => ({
      name: student.name,
      student_number: student.student_number,
      id: student.id,
    }));

  const header = ['name', 'student_number', 'id'];
  const lines = [
    header.join(','),
    ...rows.map((row) => [row.name, row.student_number, row.id].map(escapeCsvCell).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = classLabel ? `${safeName(classLabel)}_학생목록.csv` : '학생목록.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function escapeCsvCell(value: string | number) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
