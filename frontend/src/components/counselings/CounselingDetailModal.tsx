import type { Counseling } from '../../types';

export default function CounselingDetailModal({
  counseling,
  studentName,
  onEdit,
  onDelete,
  onClose,
  canEdit = true,
}: {
  counseling: Counseling;
  studentName: string;
  onEdit: (c: Counseling) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  canEdit?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-xl p-4 w-full max-w-lg max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">상담 상세 — {studentName}</h2>
          <button onClick={onClose} className="text-gray-500">×</button>
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-600">일자: </span>
            {counseling.date}
          </div>
          <div>
            <span className="text-gray-600">공유: </span>
            {counseling.is_shared ? '공유됨' : '비공유'}
          </div>
          <div>
            <span className="block text-gray-600">내용</span>
            <div className="whitespace-pre-wrap border rounded p-2">{counseling.content}</div>
          </div>
          {counseling.next_plan && (
            <div>
              <span className="block text-gray-600">다음 계획</span>
              <div className="whitespace-pre-wrap border rounded p-2">{counseling.next_plan}</div>
            </div>
          )}
        </div>
        <div className="flex justify-between mt-3">
          <div />
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-sm border rounded text-indigo-600 border-indigo-300 disabled:opacity-50"
              disabled={!canEdit}
              type="button"
              onClick={() => canEdit && onEdit(counseling)}
            >
              수정
            </button>
            <button
              className="px-3 py-1 text-sm border rounded text-red-600 border-red-300 disabled:opacity-50"
              disabled={!canEdit}
              type="button"
              onClick={() => canEdit && onDelete(counseling.id)}
            >
              삭제
            </button>
            <button type="button" className="px-3 py-1 text-sm border rounded" onClick={onClose}>닫기</button>
          </div>
        </div>
        {!canEdit && (
          <div className="mt-2 text-xs text-gray-500">다른 교사가 작성한 공유 기록입니다. 수정/삭제할 수 없습니다.</div>
        )}
      </div>
    </div>
  );
}
