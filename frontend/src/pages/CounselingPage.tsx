import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  useCounselings,
  useCreateCounseling,
  useUpdateCounseling,
  useDeleteCounseling,
} from '../hooks/useCounselings';
import { useStudents } from '../hooks/useStudents';
import StudentSelector from '../components/ui/StudentSelector';
import ClassSelector from '../components/classes/ClassSelector';
import type { Counseling } from '../types';

interface CounselingFormState {
  student_id: string;
  date: string;
  content: string;
  next_plan: string;
  is_shared: boolean;
}

const EMPTY_FORM: CounselingFormState = {
  student_id: '',
  date: new Date().toISOString().slice(0, 10),
  content: '',
  next_plan: '',
  is_shared: true,
};

export default function CounselingPage() {
  const { data: counselings, isLoading } = useCounselings();
  const createCs = useCreateCounseling();
  const updateCs = useUpdateCounseling();
  const deleteCs = useDeleteCounseling();
  const { data: allStudents } = useStudents();

  const [form, setForm] = useState<CounselingFormState>(EMPTY_FORM);
  const [classId, setClassId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id) {
      toast.error('학생을 선택해주세요.');
      return;
    }
    if (!form.content.trim()) {
      toast.error('상담 내용을 입력해주세요.');
      return;
    }
    try {
      if (editingId) {
        await updateCs.mutateAsync({ id: editingId, body: form });
        toast.success('상담 기록이 수정되었습니다.');
      } else {
        await createCs.mutateAsync(form);
        toast.success('상담 기록이 저장되었습니다.');
      }
      resetForm();
    } catch {
      toast.error('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleEdit = (cs: Counseling) => {
    setForm({
      student_id: cs.student_id,
      date: cs.date,
      content: cs.content,
      next_plan: cs.next_plan ?? '',
      is_shared: cs.is_shared,
    });
    setEditingId(cs.id);
    setShowForm(true);
  };

  function getStudentName(studentId: string): string {
    return allStudents?.find((s) => s.id === studentId)?.name ?? '알 수 없음';
  }

  const handleDelete = async (id: string) => {
    if (!confirm('상담 기록을 삭제하시겠습니까?')) return;
    try {
      await deleteCs.mutateAsync(id);
      toast.success('상담 기록이 삭제되었습니다.');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">상담 기록</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
        >
          {showForm ? '닫기' : '+ 상담 기록 추가'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded p-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">학급</label>
              <ClassSelector
                value={classId}
                onChange={(id) => {
                  setClassId(id);
                  setForm((prev) => ({ ...prev, student_id: '' }));
                }}
                disabled={!!editingId}
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">학생</label>
              <StudentSelector
                value={form.student_id}
                onChange={(id) => setForm({ ...form, student_id: id })}
                classId={classId || undefined}
                disabled={!!editingId || !classId}
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">상담 날짜</label>
              <input
                type="date"
                className="border w-full p-1 text-sm"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">상담 내용</label>
            <textarea
              className="border w-full p-1 text-sm h-24"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">다음 상담 계획</label>
            <textarea
              className="border w-full p-1 text-sm h-16"
              value={form.next_plan}
              onChange={(e) => setForm({ ...form, next_plan: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_shared}
              onChange={(e) => setForm({ ...form, is_shared: e.target.checked })}
            />
            교사 간 공유
          </label>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">
              {editingId ? '수정' : '저장'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1 bg-gray-300 rounded text-sm"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* 필터 영역 (Task 7) applied in a later commit */}

      {isLoading ? (
        <div>불러오는 중...</div>
      ) : (counselings ?? []).length === 0 ? (
        <div className="text-gray-500 text-sm">상담 기록이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {(counselings ?? []).map((cs) => (
            <div key={cs.id} className="border rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{getStudentName(cs.student_id)}</span>
                  <span className="text-xs text-gray-500">{cs.date}</span>
                </div>
                {cs.is_shared && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                    공유됨
                  </span>
                )}
              </div>
              <p className="text-sm">{cs.content}</p>
              {cs.next_plan && (
                <p className="text-xs text-gray-500">다음 계획: {cs.next_plan}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(cs)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(cs.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
