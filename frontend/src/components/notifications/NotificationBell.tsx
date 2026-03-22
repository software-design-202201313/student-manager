import { useQuery } from '@tanstack/react-query';
import { listNotifications } from '../../api/notifications';

export default function NotificationBell() {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => listNotifications({ is_read: false, limit: 10 }),
    refetchInterval: 30000,
  });
  const count = data?.length ?? 0;
  return (
    <a href="/notifications" className="relative inline-flex items-center">
      <span>🔔</span>
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1">{count}</span>
      )}
    </a>
  );
}

