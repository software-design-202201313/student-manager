import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotifications, markAllRead, markRead } from '../api/notifications';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => listNotifications(),
  });
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">알림</h1>
      <button className="border px-3 py-1 rounded" onClick={() => markAll.mutate()}>전체 읽음 처리</button>
      <ul className="space-y-2">
        {data?.map((n) => (
          <li key={n.id} className={`border p-2 rounded ${n.is_read ? 'opacity-60' : ''}`}>
            <div className="text-xs text-gray-600">{new Date(n.created_at).toLocaleString()}</div>
            <div className="text-sm">{n.message}</div>
            {!n.is_read && (
              <button className="mt-1 text-blue-600 underline text-xs" onClick={() => markOne.mutate(n.id)}>읽음</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

