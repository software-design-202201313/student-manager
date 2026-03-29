import type { Feedback } from '../../types';

const CATEGORY_LABEL: Record<Feedback['category'], string> = {
  grade: '성적',
  behavior: '행동',
  attendance: '출결',
  attitude: '태도',
};

const CATEGORY_BADGE: Record<Feedback['category'], string> = {
  grade: 'bg-indigo-100 text-indigo-700',
  behavior: 'bg-amber-100 text-amber-700',
  attendance: 'bg-sky-100 text-sky-700',
  attitude: 'bg-emerald-100 text-emerald-700',
};

function fmt(d?: string) {
  if (!d) return '-';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return d;
  }
}

export default function FeedbackHistoryModal({
  studentLabel,
  items,
  onClose,
  onEdit,
}: {
  studentLabel: string;
  items: Feedback[];
  onClose: () => void;
  onEdit?: (fb: Feedback) => void;
}) {
  const sorted = items.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-xl p-4 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">피드백 내역 — {studentLabel}</h2>
          <button onClick={onClose} className="text-gray-500">×</button>
        </div>
        {sorted.length === 0 ? (
          <div className="text-sm text-gray-500">피드백이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((fb) => (
              <div key={fb.id} className="border rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_BADGE[fb.category]}`}>
                    {CATEGORY_LABEL[fb.category]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{fmt(fb.created_at)}</span>
                    {onEdit && (
                      <button
                        className="text-xs text-indigo-600"
                        onClick={() => onEdit(fb)}
                      >
                        수정
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-sm whitespace-pre-wrap">{fb.content}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-3">
          <button onClick={onClose} className="px-3 py-1 text-sm border rounded">닫기</button>
        </div>
      </div>
    </div>
  );
}
