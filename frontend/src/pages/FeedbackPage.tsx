import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  useCreateFeedback,
  useDeleteFeedback,
  useFeedbacks,
  useUpdateFeedback,
} from '../hooks/useFeedbacks';
import StudentSelector from '../components/ui/StudentSelector';
import ClassSelector from '../components/classes/ClassSelector';
import { useStudents } from '../hooks/useStudents';
import type { Feedback, StudentSummary } from '../types';
import FeedbackHistoryModal from '../components/feedbacks/FeedbackHistoryModal';

const CATEGORIES: Feedback['category'][] = ['grade', 'behavior', 'attendance', 'attitude'];
const CATEGORY_LABEL: Record<Feedback['category'], string> = {
  grade: '성적',
  behavior: '행동',
  attendance: '출결',
  attitude: '태도',
};

interface FeedbackFormState {
  student_id: string;
  category: Feedback['category'];
  content: string;
  is_visible_to_student: boolean;
  is_visible_to_parent: boolean;
}

const EMPTY_FORM: FeedbackFormState = {
  student_id: '',
  category: 'grade',
  content: '',
  is_visible_to_student: false,
  is_visible_to_parent: false,
};

export default function FeedbackPage() {
  const { data: feedbacks, isLoading } = useFeedbacks();
  const createFb = useCreateFeedback();
  const updateFb = useUpdateFeedback();
  const deleteFb = useDeleteFeedback();

  const [form, setForm] = useState<FeedbackFormState>(EMPTY_FORM);
  const [classId, setClassId] = useState<string>(() => {
    try {
      return localStorage.getItem('selectedClassId') ?? '';
    } catch {
      return '';
    }
  });
  const { data: students } = useStudents(classId || undefined);
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
      toast.error('내용을 입력해주세요.');
      return;
    }
    try {
      if (editingId) {
        await updateFb.mutateAsync({ id: editingId, body: form });
        toast.success('피드백이 수정되었습니다.');
      } else {
        await createFb.mutateAsync(form);
        toast.success('피드백이 저장되었습니다.');
      }
      resetForm();
    } catch {
      toast.error('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleEdit = (fb: Feedback) => {
    setForm({
      student_id: fb.student_id,
      category: fb.category,
      content: fb.content,
      is_visible_to_student: fb.is_visible_to_student,
      is_visible_to_parent: fb.is_visible_to_parent,
    });
    setEditingId(fb.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await deleteFb.mutateAsync(id);
  };

  function pickLatestBy<T extends { created_at: string; student_id: string }>(
    items: T[],
  ): Record<string, T | undefined> {
    const map: Record<string, T | undefined> = {};
    for (const item of items) {
      const prev = map[item.student_id];
      if (!prev || prev.created_at < item.created_at) map[item.student_id] = item;
    }
    return map;
  }

  const latestFeedbackByStudent = useMemo(
    () => pickLatestBy<Feedback>(feedbacks ?? []),
    [feedbacks],
  );
  const sortedStudents: StudentSummary[] = useMemo(() => {
    return (students ?? []).slice().sort((a, b) => a.student_number - b.student_number);
  }, [students]);
  // Show only students who currently have at least one feedback
  const studentsWithFeedback: StudentSummary[] = useMemo(() => {
    const idsWithFb = new Set((feedbacks ?? []).map((f) => f.student_id));
    return sortedStudents.filter((s) => idsWithFb.has(s.id));
  }, [sortedStudents, feedbacks]);

  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  function formatDate(dateStr?: string) {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toISOString().slice(0, 10);
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">피드백 관리</h1>
        {classId && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
          >
            {showForm ? '닫기' : '+ 피드백 작성'}
          </button>
        )}
      </div>

      {/* 학급 선택 (대시보드 및 폼 공용 상태) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-600">학급 선택</label>
          <ClassSelector
            value={classId}
            onChange={(id) => {
              setClassId(id);
              if (id) localStorage.setItem('selectedClassId', id);
              setForm((prev) => ({ ...prev, student_id: '' }));
              if (!id) {
                setShowForm(false);
                setEditingId(null);
              }
            }}
            disabled={!!editingId}
          />
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded p-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
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
              <label className="text-sm text-gray-600">카테고리</label>
              <select
                className="border w-full p-1 text-sm"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as Feedback['category'] })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">내용</label>
            <textarea
              className="border w-full p-1 text-sm h-24"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={form.is_visible_to_student}
                onChange={(e) => setForm({ ...form, is_visible_to_student: e.target.checked })}
              />
              학생 공개
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={form.is_visible_to_parent}
                onChange={(e) => setForm({ ...form, is_visible_to_parent: e.target.checked })}
              />
              학부모 공개
            </label>
          </div>
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

      {/* 학급 선택 시 학생 리스트 (번호/이름/최근 피드백 일자/피드백 내용/수정/삭제) */}
      <div className="space-y-2">
        {!classId ? (
          <div className="text-sm text-gray-500">학급을 먼저 선택하세요.</div>
        ) : !students ? (
          <div>불러오는 중...</div>
        ) : students.length === 0 ? (
          <div className="text-sm text-gray-500">학생이 없습니다.</div>
        ) : studentsWithFeedback.length === 0 ? (
          <div className="text-sm text-gray-500">피드백이 없습니다.</div>
        ) : (
          <table className="w-full text-sm border bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border">번호</th>
                <th className="p-2 border">이름</th>
                <th className="p-2 border">최근 피드백 일자</th>
                <th className="p-2 border text-center">피드백 내용</th>
                <th className="p-2 border">삭제</th>
              </tr>
            </thead>
            <tbody>
              {studentsWithFeedback.map((s) => {
                const fb = latestFeedbackByStudent[s.id];
                return (
                  <tr key={s.id} className="border-b">
                    <td className="p-2 border text-center">{s.student_number}</td>
                    <td className="p-2 border">{s.name}</td>
                    <td className="p-2 border text-center">{formatDate(fb?.created_at)}</td>
                    <td className="p-2 border text-center">
                      {fb ? (
                        <button
                          type="button"
                          className="px-2 py-0.5 text-xs border rounded"
                          onClick={() => setHistoryStudentId(s.id)}
                        >
                          내용 보기
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-2 border text-center">
                      <button
                        type="button"
                        className="text-xs text-red-500 disabled:text-gray-300"
                        disabled={!fb}
                        onClick={() => fb && handleDelete(fb.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {historyStudentId && (
        <FeedbackHistoryModal
          studentLabel={(() => {
            const st = (students ?? []).find((x) => x.id === historyStudentId);
            return st ? `${st.student_number}번 ${st.name}` : '학생';
          })()}
          items={(feedbacks ?? []).filter((x) => x.student_id === historyStudentId)}
          onEdit={(fb) => {
            handleEdit(fb);
            setHistoryStudentId(null);
          }}
          onClose={() => setHistoryStudentId(null)}
        />
      )}
    </div>
  );
}
