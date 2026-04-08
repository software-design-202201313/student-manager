export default function InvitationStatusBadge({
  status,
  sentAt,
}: {
  status?: 'not_sent' | 'pending' | 'accepted' | 'expired' | string;
  sentAt?: string | null;
}) {
  const value: string = status || (sentAt ? 'pending' : 'not_sent');

  const config =
    value === 'accepted'
      ? { label: '수락', className: 'bg-green-50 text-green-700 border-green-200' }
      : value === 'expired'
        ? { label: '만료', className: 'bg-gray-100 text-gray-700 border-gray-200' }
        : value === 'not_sent'
          ? { label: '미전송', className: 'bg-gray-50 text-gray-700 border-gray-200' }
          : { label: '대기', className: 'bg-amber-50 text-amber-700 border-amber-200' };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
