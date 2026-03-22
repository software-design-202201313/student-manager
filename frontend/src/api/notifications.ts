import apiClient from './client';

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function listNotifications(params?: { is_read?: boolean; limit?: number }): Promise<NotificationItem[]> {
  const { data } = await apiClient.get<NotificationItem[]>('/notifications', { params });
  return data;
}

export async function markRead(id: string): Promise<NotificationItem> {
  const { data } = await apiClient.patch<NotificationItem>(`/notifications/${id}/read`, {});
  return data;
}

export async function markAllRead(): Promise<{ updated: number }> {
  const { data } = await apiClient.patch<{ updated: number }>(`/notifications/read-all`, {});
  return data;
}

export interface NotificationPreferences {
  grade_input: boolean;
  feedback_created: boolean;
  counseling_updated: boolean;
}

export async function getPreferences(): Promise<NotificationPreferences> {
  const { data } = await apiClient.get<NotificationPreferences>('/notifications/preferences');
  return data;
}

export async function updatePreferences(p: NotificationPreferences): Promise<NotificationPreferences> {
  const { data } = await apiClient.put<NotificationPreferences>('/notifications/preferences', p);
  return data;
}

