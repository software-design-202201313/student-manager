import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { createStudentAccount } from '../../api/users';
import { parseBulkInviteFile, parseBulkInviteText, type BulkInviteRow } from '../../utils/bulkInviteParser';
import { copyText } from '../../utils/clipboard';

type Tab = 'upload' | 'paste';

export default function BulkInviteModal({ classId, onClose }: { classId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('upload');
  const [rows, setRows] = useState<BulkInviteRow[]>([]);
  const [pasteValue, setPasteValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validRows = useMemo(() => rows.filter((row) => row.status === 'valid'), [rows]);
  const createdLinks = useMemo(() => rows.map((row) => row.invite_url).filter((value): value is string => Boolean(value)), [rows]);

  const validateFromText = () => {
    setRows(parseBulkInviteText(pasteValue));
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const parsed = await parseBulkInviteFile(file);
    setRows(parsed);
  };

  const handleCreate = async () => {
    if (validRows.length === 0) {
      toast.error('생성할 수 있는 학생이 없습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nextRows = [...rows];
      for (const row of validRows) {
        const rowIndex = nextRows.findIndex((item) => item.id === row.id);
        nextRows[rowIndex] = { ...nextRows[rowIndex], status: 'creating' };
        setRows([...nextRows]);

        try {
          const created = await createStudentAccount({
            class_id: classId,
            name: row.name,
            email: row.email,
            student_number: row.student_number || 1,
            birth_date: row.birth_date,
          });
          nextRows[rowIndex] = {
            ...nextRows[rowIndex],
            status: 'created',
            invite_url: created.invite_url || undefined,
            issues: [],
          };
        } catch (error: any) {
          nextRows[rowIndex] = {
            ...nextRows[rowIndex],
            status: 'failed',
            issues: [error?.response?.data?.detail || '생성 실패'],
          };
        }
        setRows([...nextRows]);
      }
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('유효한 학생 초대를 생성했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAllLinks = async () => {
    if (createdLinks.length === 0) return;
    await copyText(createdLinks.join('\n'));
    toast.success('초대 링크를 복사했습니다.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-5xl rounded-xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">여러 명 초대</h2>
          <button onClick={onClose} className="text-gray-500">×</button>
        </div>

        <div role="tablist" className="mb-4 flex gap-2 border-b pb-3">
          <button role="tab" aria-selected={tab === 'upload'} onClick={() => setTab('upload')} className={`rounded px-3 py-1 text-sm ${tab === 'upload' ? 'bg-indigo-600 text-white' : 'border'}`}>
            CSV/XLSX 업로드
          </button>
          <button role="tab" aria-selected={tab === 'paste'} onClick={() => setTab('paste')} className={`rounded px-3 py-1 text-sm ${tab === 'paste' ? 'bg-indigo-600 text-white' : 'border'}`}>
            엑셀 표 붙여넣기
          </button>
        </div>

        {tab === 'upload' ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">`이름`, `이메일`, `번호`, `생년월일` 헤더가 있는 CSV 또는 XLSX 파일을 업로드하세요.</div>
            <input type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={(e) => void handleFile(e.target.files?.[0] || null)} />
          </div>
        ) : (
          <div className="space-y-3">
            <label htmlFor="bulk-invite-paste" className="block text-sm font-medium text-gray-700">붙여넣기 입력</label>
            <textarea
              id="bulk-invite-paste"
              className="min-h-40 w-full rounded border p-2 text-sm"
              placeholder={'이름\t이메일\t번호\n김철수\tkim@example.com\t1'}
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
            />
            <button type="button" className="rounded border px-3 py-1 text-sm" onClick={validateFromText}>검증하기</button>
          </div>
        )}

        <div className="mt-4 rounded border">
          <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2 text-sm">
            <div>검증 결과</div>
            <div className="text-gray-500">유효 {validRows.length}건 / 전체 {rows.length}건</div>
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border-b px-3 py-2 text-left">행</th>
                  <th className="border-b px-3 py-2 text-left">이름</th>
                  <th className="border-b px-3 py-2 text-left">이메일</th>
                  <th className="border-b px-3 py-2 text-left">번호</th>
                  <th className="border-b px-3 py-2 text-left">상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">업로드 또는 붙여넣기 후 검증 결과가 표시됩니다.</td>
                  </tr>
                ) : rows.map((row) => (
                  <tr key={row.id}>
                    <td className="border-b px-3 py-2">{row.rowNumber}</td>
                    <td className="border-b px-3 py-2">{row.name}</td>
                    <td className="border-b px-3 py-2">{row.email}</td>
                    <td className="border-b px-3 py-2">{row.student_number ?? '-'}</td>
                    <td className="border-b px-3 py-2">
                      {row.status === 'valid' && '유효'}
                      {row.status === 'invalid' && (row.issues[0] || '오류')}
                      {row.status === 'creating' && '생성 중'}
                      {row.status === 'created' && '생성 완료'}
                      {row.status === 'failed' && (row.issues[0] || '생성 실패')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {createdLinks.length > 0 && (
            <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => void copyAllLinks()}>
              초대 링크 일괄 복사
            </button>
          )}
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onClose}>닫기</button>
          <button type="button" className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-50" disabled={isSubmitting || validRows.length === 0} onClick={() => void handleCreate()}>
            {isSubmitting ? '생성 중...' : '유효한 학생만 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
