import apiClient from './client';
import type {
  OnboardingAccount,
  StudentInvitationActionResult,
  StudentOnboardingResult,
  StudentSummary,
} from '../types';

export async function listStudents(classId?: string): Promise<StudentSummary[]> {
  const { data } = await apiClient.get<StudentSummary[]>(
    '/users/students',
    { params: { class_id: classId } },
  );
  return data;
}

export async function createStudentAccount(payload: {
  email: string;
  name: string;
  class_id: string;
  student_number: number;
  birth_date?: string;
}): Promise<StudentOnboardingResult> {
  const { data } = await apiClient.post<StudentOnboardingResult>('/users/students', payload);
  return data;
}

export async function createParentAccount(payload: {
  email: string;
  name: string;
  student_id: string;
}): Promise<OnboardingAccount> {
  const { data } = await apiClient.post<OnboardingAccount>('/users/parents', payload);
  return data;
}

export async function resendStudentInvitation(studentId: string): Promise<StudentInvitationActionResult> {
  const { data } = await apiClient.post<StudentInvitationActionResult>(`/users/students/${studentId}/invitation/resend`);
  return data;
}

export async function expireStudentInvitation(studentId: string): Promise<StudentInvitationActionResult> {
  const { data } = await apiClient.post<StudentInvitationActionResult>(`/users/students/${studentId}/invitation/expire`);
  return data;
}
