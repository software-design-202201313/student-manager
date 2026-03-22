import apiClient from './client';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  user_id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  school_id: string;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', { email, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

