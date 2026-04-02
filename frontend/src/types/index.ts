export interface Semester {
  id: string;
  year: number;
  term: number;
}

export interface ClassSummary {
  id: string;
  name: string;
  grade: number;
  year: number;
}

export interface Subject {
  id: string;
  class_id: string;
  name: string;
}

export interface StudentSummary {
  id: string;
  user_id: string;
  class_id: string;
  student_number: number;
  name: string;
}

export interface StudentDetail extends StudentSummary {
  email: string;
  account_status: string;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
}

export interface OnboardingAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  account_status: string;
  invite_url?: string | null;
  invite_expires_at?: string | null;
}

export interface StudentOnboardingResult {
  id: string;
  user_id: string;
  class_id: string;
  student_number: number;
  name: string;
  email: string;
  account_status: string;
  invite_url?: string | null;
  invite_expires_at?: string | null;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'early_leave';
  note?: string | null;
}

export interface SpecialNote {
  id: string;
  student_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GradeItem {
  id: string;
  student_id: string;
  subject_id: string;
  semester_id: string;
  score: number | null;
  grade_rank: number | null;
}

export interface Feedback {
  id: string;
  student_id: string;
  teacher_id: string;
  category: 'grade' | 'behavior' | 'attendance' | 'attitude';
  content: string;
  is_visible_to_student: boolean;
  is_visible_to_parent: boolean;
  created_at: string;
}

export interface Counseling {
  id: string;
  student_id: string;
  teacher_id: string;
  student_name?: string | null;
  teacher_name?: string | null;
  date: string;
  content: string;
  next_plan: string | null;
  is_shared: boolean;
  created_at: string;
}
