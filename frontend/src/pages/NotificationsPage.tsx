import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  getPreferences,
  listNotifications,
  markAllRead,
  markRead,
  NotificationItem,
  type NotificationPreferences,
  updatePreferences,
} from '../api/notifications';
import { useAuthStore } from '../stores/authStore';

const NOTIFICATION_LABELS: Record<string, string> = {
  grade_input: '성적 입력',
  feedback_created: '피드백',
  counseling_updated: '상담',
};

const GENERATED_NAME_SUFFIX_RE = /-notify-\d{10,}-[a-z0-9]+$/i;
const PAGE_SIZE = 5;

function cleanEntityLabel(value: string): string {
  return value.replace(GENERATED_NAME_SUFFIX_RE, '').trim().replace(/[\s-]+$/g, '');
}

function formatNotificationMessage(notification: NotificationItem): string {
  const raw = notification.message?.trim();
  if (!raw) return '알림 내용을 확인해 주세요.';

  const gradeMatch = raw.match(/^(.*?)의 (.*?) 성적이 저장되었습니다\.$/);
  if (gradeMatch) {
    return `${cleanEntityLabel(gradeMatch[1])} · ${cleanEntityLabel(gradeMatch[2])} 성적이 저장되었어요.`;
  }

  const feedbackMatch = raw.match(/^(.*?) 피드백이 등록되었습니다\.$/);
  if (feedbackMatch) {
    return `${cleanEntityLabel(feedbackMatch[1])} · 새 피드백이 등록되었어요.`;
  }

  const counselingMatch = raw.match(/^(.*?) 상담 기록이 업데이트되었습니다\.$/);
  if (counselingMatch) {
    return `${cleanEntityLabel(counselingMatch[1])} · 상담 기록이 업데이트되었어요.`;
  }

  return cleanEntityLabel(raw);
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const [currentPage, setCurrentPage] = useState(1);

  const { data } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => listNotifications(),
  });

  const { data: preferences } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => getPreferences(),
  });
  const [draftPreferences, setDraftPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (preferences) {
      setDraftPreferences(preferences);
    }
  }, [preferences]);

  const markOne = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const savePreferences = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    },
  });

  const togglePreference = (key: keyof NotificationPreferences) => {
    setDraftPreferences((current) => {
      if (!current) return current;
      return { ...current, [key]: !current[key] };
    });
  };

  const visibleNotifications = useMemo(() => {
    if (!data) return [];
    if (!draftPreferences) return data;

    return data.filter((notification) => {
      if (notification.type === 'grade_input') return draftPreferences.grade_input;
      if (notification.type === 'feedback_created') return draftPreferences.feedback_created;
      if (notification.type === 'counseling_updated') return draftPreferences.counseling_updated;
      return true;
    });
  }, [data, draftPreferences]);

  const totalPages = Math.max(1, Math.ceil(visibleNotifications.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [draftPreferences?.grade_input, draftPreferences?.feedback_created, draftPreferences?.counseling_updated]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return visibleNotifications.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, visibleNotifications]);

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      await markOne.mutateAsync(notification.id);
    }

    if (role === 'teacher') {
      if (notification.type === 'grade_input' && notification.related_id) {
        navigate(`/grades/${notification.related_id}`);
        return;
      }
      if (notification.type === 'counseling_updated' && notification.related_id) {
        navigate(`/counselings?studentId=${notification.related_id}`);
        return;
      }
      if (notification.type === 'feedback_created' && notification.related_id) {
        navigate(`/students/${notification.related_id}`);
        return;
      }
    }

    if (role === 'student') {
      navigate('/student');
      return;
    }
    if (role === 'parent') {
      navigate('/parent');
      return;
    }

    navigate('/notifications');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">알림</h1>
      {draftPreferences && (
        <section className="border rounded p-3 space-y-2">
          <h2 className="font-medium">알림 설정</h2>
          <p className="text-sm text-gray-500">설정을 끄면 새 알림 수신이 중단되고, 현재 목록에서도 해당 유형이 숨겨집니다.</p>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="notification-grade-input"
              type="checkbox"
              checked={draftPreferences.grade_input}
              onChange={() => togglePreference('grade_input')}
            />
            <label htmlFor="notification-grade-input">성적 입력 알림</label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="notification-feedback-created"
              type="checkbox"
              checked={draftPreferences.feedback_created}
              onChange={() => togglePreference('feedback_created')}
            />
            <label htmlFor="notification-feedback-created">피드백 알림</label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="notification-counseling-updated"
              type="checkbox"
              checked={draftPreferences.counseling_updated}
              onChange={() => togglePreference('counseling_updated')}
            />
            <label htmlFor="notification-counseling-updated">상담 알림</label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className="border px-3 py-1 rounded text-sm"
              onClick={() => draftPreferences && savePreferences.mutate(draftPreferences)}
            >
              설정 저장
            </button>
          </div>
        </section>
      )}
      <button className="border px-3 py-1 rounded" onClick={() => markAll.mutate()}>전체 읽음 처리</button>
      {(!data || data.length === 0) ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">알림이 없습니다</p>
          <p className="text-sm mt-1">새로운 알림이 오면 여기에 표시됩니다.</p>
        </div>
      ) : visibleNotifications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">현재 설정으로 표시할 알림이 없어요</p>
          <p className="text-sm mt-1">알림 설정을 다시 켜면 숨겨진 알림을 바로 볼 수 있습니다.</p>
        </div>
      ) : (
        <section className="flex h-[36rem] flex-col">
          <ul className="flex-1 space-y-2 overflow-y-auto pr-1">
            {paginatedNotifications.map((notification) => (
              <li key={notification.id} className={`border p-2 rounded ${notification.is_read ? 'opacity-60' : ''}`}>
                <div className="text-xs text-gray-600">{new Date(notification.created_at).toLocaleString()}</div>
                <div className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {NOTIFICATION_LABELS[notification.type] ?? '알림'}
                </div>
                <div className="mt-1 text-sm text-gray-800">{formatNotificationMessage(notification)}</div>
                {!notification.is_read && (
                  <button className="mt-1 text-blue-600 underline text-xs" onClick={() => markOne.mutate(notification.id)}>읽음</button>
                )}
                <button className="mt-1 ml-3 text-blue-600 underline text-xs" onClick={() => openNotification(notification)}>관련 화면으로 이동</button>
              </li>
            ))}
          </ul>
          {visibleNotifications.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                aria-label="이전 페이지"
                className="inline-flex h-8 w-8 items-center justify-center rounded border text-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                ←
              </button>
              <span className="text-sm text-gray-500">{currentPage} / {totalPages}</span>
              <button
                type="button"
                aria-label="다음 페이지"
                className="inline-flex h-8 w-8 items-center justify-center rounded border text-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                →
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
