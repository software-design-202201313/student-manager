# UI/UX 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chrome DevTools MCP를 통해 발견된 28개 UI/UX 문제점을 우선순위별로 수정하여 Student Manager의 사용성과 일관성을 개선한다.

**Architecture:** 프론트엔드 중심 수정. 백엔드 API 변경 없이 기존 데이터를 활용하여 UI 개선. 카테고리 한국어 매핑, 학생 이름 표시, 빈 상태 처리, 접근성 향상 등을 단계적으로 적용.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, TanStack Query, React Router, react-hot-toast

---

## File Structure

수정 대상 파일 목록과 각 파일의 역할:

| 파일 경로 | 역할 | 변경 유형 |
|-----------|------|-----------|
| `frontend/src/pages/DashboardPage.tsx` | 대시보드 - 통계, 최근 피드백/상담 | 수정 |
| `frontend/src/pages/StudentListPage.tsx` | 학생 목록 - 학급 선택, 학생 테이블 | 수정 |
| `frontend/src/components/students/StudentList.tsx` | 학생 테이블 행 렌더링 | 수정 |
| `frontend/src/pages/FeedbackPage.tsx` | 피드백 관리 - CRUD | 수정 |
| `frontend/src/pages/CounselingPage.tsx` | 상담 기록 - CRUD | 수정 |
| `frontend/src/pages/NotificationsPage.tsx` | 알림 목록 | 수정 |
| `frontend/src/pages/LoginPage.tsx` | 로그인 폼 | 수정 |
| `frontend/src/components/layout/Header.tsx` | 상단 헤더 바 | 수정 |
| `frontend/src/components/layout/Sidebar.tsx` | 사이드바 네비게이션 | 수정 |
| `frontend/src/hooks/useCounselings.ts` | 상담 기록 hooks (삭제 추가) | 수정 |
| `frontend/src/api/counselings.ts` | 상담 API 클라이언트 (삭제 추가) | 수정 |
| `backend/app/routers/counselings.py` | 상담 API 엔드포인트 (삭제 추가) | 수정 |

---

## Task 1: 대시보드 - 최근 피드백/상담에 학생 이름 추가 및 카테고리 한국어 표시

**심각도:** 높음 (3개 이슈 한번에 해결: #11, #12, #13)

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

**현재 문제:**
- 최근 피드백: `[behavior] 행동이 좋지 않아요.` - 학생 이름 없음, 카테고리 영문
- 최근 상담: `2026-03-17 — 공부를 열심히 해요.` - 학생 이름 없음

**참고:** `Feedback` 타입에 `student_id`가 있고, `useStudents()` hook으로 학생 목록을 이미 가져오고 있음. `Counseling` 타입도 동일하게 `student_id` 보유.

- [x] **Step 1: DashboardPage에 카테고리 한국어 매핑과 학생 이름 표시 추가**

`frontend/src/pages/DashboardPage.tsx` 수정:

```tsx
// 파일 상단에 카테고리 매핑 추가
const CATEGORY_LABEL: Record<string, string> = {
  grade: '성적',
  behavior: '행동',
  attendance: '출결',
  attitude: '태도',
};
```

`recentFeedbacks.map` 렌더링 부분 변경:

```tsx
recentFeedbacks.map((fb) => {
  const studentName = students?.find((s) => s.id === fb.student_id)?.name;
  return (
    <p key={fb.id} className="text-xs text-gray-600 truncate">
      <span className="font-medium">{studentName ?? '알 수 없음'}</span>
      {' '}
      [{CATEGORY_LABEL[fb.category] ?? fb.category}] {fb.content}
    </p>
  );
})
```

`recentCounselings.map` 렌더링 부분 변경:

```tsx
recentCounselings.map((cs) => {
  const studentName = students?.find((s) => s.id === cs.student_id)?.name;
  return (
    <p key={cs.id} className="text-xs text-gray-600 truncate">
      <span className="font-medium">{studentName ?? '알 수 없음'}</span>
      {' '}
      {cs.date} — {cs.content}
    </p>
  );
})
```

- [x] **Step 2: 변경 확인**

Run: `npx tsc --noEmit`
Expected: 타입 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "fix(dashboard): 최근 피드백/상담에 학생 이름 및 한국어 카테고리 표시"
```

---

## Task 2: 대시보드 - 통계 카드 클릭 시 해당 페이지 이동

**심각도:** 중간 (#10)

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

**현재 문제:** 통계 카드(담당 학생 수, 피드백 수, 상담 기록 수)가 클릭 불가한 plain div.

- [x] **Step 1: stats 배열에 링크 추가하고 카드를 클릭 가능하게 변경**

```tsx
// stats 배열에 href 추가
const stats = [
  { label: '담당 학생 수', value: students?.length ?? '-', href: '/students' },
  { label: '피드백 수', value: feedbacks?.length ?? '-', href: '/feedbacks' },
  { label: '상담 기록 수', value: counselings?.length ?? '-', href: '/counselings' },
];
```

상단에 `Link` import 추가하고, 카드 렌더링을 `<Link>` 태그로 변경:

```tsx
// 상단에 import 추가
import { Link } from 'react-router-dom';

// 카드 렌더링
{stats.map((s) => (
  <Link
    key={s.label}
    to={s.href}
    className="border rounded p-4 text-center bg-white hover:shadow-md transition-shadow cursor-pointer block"
  >
    <div className="text-2xl font-bold text-indigo-600">{s.value}</div>
    <div className="text-sm text-gray-500 mt-1">{s.label}</div>
  </Link>
))}
```

추가로, 기존 "전체 보기" 링크(라인 39, 54)도 `<a href>`에서 `<Link to>`로 변경:

```tsx
// 변경 전
<a href="/feedbacks" className="text-xs text-indigo-600 hover:underline">전체 보기</a>
// 변경 후
<Link to="/feedbacks" className="text-xs text-indigo-600 hover:underline">전체 보기</Link>

// 변경 전
<a href="/counselings" className="text-xs text-indigo-600 hover:underline">전체 보기</a>
// 변경 후
<Link to="/counselings" className="text-xs text-indigo-600 hover:underline">전체 보기</Link>
```

- [x] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): 통계 카드 클릭 시 해당 페이지로 이동"
```

---

## Task 3: 학생 목록 - 행 클릭 시 학생 상세 페이지 이동

**심각도:** 높음 (#1)

**Files:**
- Modify: `frontend/src/components/students/StudentList.tsx`

**현재 문제:** 학생 이름 클릭 시 아무 반응 없음. `StudentDetailPage.tsx`가 이미 존재하므로 라우팅만 연결하면 됨.

**참고:** `frontend/src/pages/StudentDetailPage.tsx`가 이미 있음. App.tsx에서 라우트 확인 필요.

- [x] **Step 1: App.tsx에서 학생 상세 라우트 확인**

`frontend/src/App.tsx`를 읽어서 `/students/:id` 라우트 존재 여부 확인. 없으면 추가.

- [x] **Step 2: StudentList.tsx의 StudentRow에 클릭 네비게이션 추가**

`frontend/src/components/students/StudentList.tsx` 수정:

```tsx
// 상단에 import 추가
import { useNavigate } from 'react-router-dom';

// StudentRow 컴포넌트 내부
function StudentRow({ s }: { s: StudentSummary }) {
  const navigate = useNavigate();
  // ... 기존 hooks ...

  return (
    <tr
      className="border-b hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/students/${s.id}`)}
    >
      {/* 기존 td들 그대로 */}
    </tr>
  );
}
```

- [x] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/components/students/StudentList.tsx frontend/src/App.tsx
git commit -m "feat(students): 학생 행 클릭 시 상세 페이지로 이동"
```

---

## Task 4: 학생 목록 - "엑셀로 등록" / "Excel로 내보내기" 표기 통일

**심각도:** 중간 (#17)

**Files:**
- Modify: `frontend/src/pages/StudentListPage.tsx:129`

**현재 문제:** "엑셀로 등록"(한글) vs "Excel로 내보내기"(영문) 표기 불일치

- [x] **Step 1: 버튼 텍스트 통일**

`frontend/src/pages/StudentListPage.tsx` 라인 136의 `Excel로 내보내기`를 `엑셀로 내보내기`로 변경:

```tsx
// 변경 전
>Excel로 내보내기</button>

// 변경 후
>엑셀로 내보내기</button>
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/pages/StudentListPage.tsx
git commit -m "fix(students): 엑셀 버튼 한글 표기 통일"
```

---

## Task 5: 상담 기록 - 학생 이름 표시 추가

**심각도:** 높음 (#24)

**Files:**
- Modify: `frontend/src/pages/CounselingPage.tsx`
- Modify: `frontend/src/hooks/useStudents.ts` (확인 필요)

**현재 문제:** 상담 기록 카드에 날짜와 내용만 표시, 어떤 학생의 상담인지 알 수 없음

**참고:** 현재 `useStudents()`를 사용하고 있지 않음. 학생 이름을 표시하려면 학생 데이터 필요. 전체 학생 목록을 가져오거나, 백엔드 응답에 `student_name`을 포함시켜야 함.

- [x] **Step 1: CounselingPage에서 students 데이터 로드 및 이름 표시**

`frontend/src/pages/CounselingPage.tsx` 수정:

```tsx
// 상단 import에 추가
import { useStudents } from '../hooks/useStudents';

// 컴포넌트 내부에 추가
const { data: allStudents } = useStudents();

// 헬퍼 함수
function getStudentName(studentId: string): string {
  return allStudents?.find((s) => s.id === studentId)?.name ?? '알 수 없음';
}
```

상담 기록 카드 렌더링 부분 수정 - 날짜 옆에 학생 이름 추가:

```tsx
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
```

- [x] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/CounselingPage.tsx
git commit -m "fix(counseling): 상담 기록에 학생 이름 표시"
```

---

## Task 6: 상담 기록 - 삭제 기능 추가

**심각도:** 높음 (#5)

**Files:**
- Modify: `backend/app/services/counseling.py` (delete_counseling 서비스 함수 추가)
- Modify: `backend/app/routers/counselings.py` (DELETE 엔드포인트 추가)
- Modify: `frontend/src/api/counselings.ts` (삭제 API 함수 추가)
- Modify: `frontend/src/hooks/useCounselings.ts` (useDeleteCounseling hook 추가)
- Modify: `frontend/src/pages/CounselingPage.tsx` (삭제 버튼 추가)

**참고:**
- 피드백(feedbacks)에는 이미 삭제 기능이 있음 → 같은 패턴 참조
- 기존 코드는 서비스 레이어 패턴 사용: router → service → DB
- 의존성 주입: `current_user: User = Depends(require_role("teacher"))` 패턴 사용

- [x] **Step 1: 백엔드 - 서비스 레이어에 delete_counseling 함수 추가**

`backend/app/services/counseling.py`에 `update_counseling` 함수 아래에 추가:

```python
async def delete_counseling(
    db: AsyncSession,
    *,
    counseling_id: uuid.UUID,
    teacher_id: uuid.UUID,
) -> None:
    result = await db.execute(select(Counseling).where(Counseling.id == counseling_id))
    cs = result.scalar_one_or_none()
    if cs is None:
        raise AppException(404, "Counseling not found", "COUNSELING_NOT_FOUND")
    if cs.teacher_id != teacher_id:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")
    await db.delete(cs)
    await db.commit()
```

- [x] **Step 2: 백엔드 - 라우터에 DELETE 엔드포인트 추가**

`backend/app/routers/counselings.py` 수정:

import 변경 (line 11):
```python
# 변경 전
from app.services.counseling import create_counseling, list_counselings, update_counseling
# 변경 후
from app.services.counseling import create_counseling, delete_counseling, list_counselings, update_counseling
```

파일 맨 아래에 엔드포인트 추가:
```python
@router.delete("/{counseling_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_counseling_endpoint(
    counseling_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    await delete_counseling(
        db,
        counseling_id=uuid.UUID(counseling_id),
        teacher_id=current_user.id,
    )
```

- [x] **Step 2: 프론트엔드 - API 클라이언트에 삭제 함수 추가**

`frontend/src/api/counselings.ts`에 추가:

```typescript
export async function deleteCounseling(id: string): Promise<void> {
  await client.delete(`/counselings/${id}`);
}
```

- [x] **Step 3: 프론트엔드 - useDeleteCounseling hook 추가**

`frontend/src/hooks/useCounselings.ts`에 추가:

```typescript
import { deleteCounseling } from '../api/counselings';

export function useDeleteCounseling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCounseling(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['counselings'] });
    },
  });
}
```

- [x] **Step 4: 프론트엔드 - CounselingPage에 삭제 버튼 추가**

`frontend/src/pages/CounselingPage.tsx` 수정:

```tsx
// import에 useDeleteCounseling 추가
import {
  useCounselings,
  useCreateCounseling,
  useUpdateCounseling,
  useDeleteCounseling,
} from '../hooks/useCounselings';

// 컴포넌트 내부
const deleteCs = useDeleteCounseling();

// handleDelete 함수 추가
const handleDelete = async (id: string) => {
  if (!confirm('상담 기록을 삭제하시겠습니까?')) return;
  try {
    await deleteCs.mutateAsync(id);
    toast.success('상담 기록이 삭제되었습니다.');
  } catch {
    toast.error('삭제에 실패했습니다.');
  }
};
```

수정 버튼 옆에 삭제 버튼 추가:

```tsx
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
```

- [x] **Step 5: 타입 체크 및 백엔드 테스트**

Run: `npx tsc --noEmit`
Run: `cd backend && pytest -x -q`

- [ ] **Step 6: 커밋**

```bash
git add backend/app/services/counseling.py backend/app/routers/counselings.py frontend/src/api/counselings.ts frontend/src/hooks/useCounselings.ts frontend/src/pages/CounselingPage.tsx
git commit -m "feat(counseling): 상담 기록 삭제 기능 추가"
```

---

## Task 7: 상담 기록 - 학생/학급 필터 추가

**심각도:** 높음 (#23)

**Files:**
- Modify: `frontend/src/pages/CounselingPage.tsx`

**현재 문제:** 모든 상담 기록이 필터 없이 나열됨. 학급/학생별 필터가 없어 기록이 많아지면 찾기 어려움.

- [x] **Step 1: CounselingPage에 학급/학생 필터 UI 추가**

상담 기록 목록 상단에 필터 영역 추가:

```tsx
// 폼 아래, 목록 위에 필터 추가
<div className="flex gap-3 items-end">
  <div>
    <label className="text-sm text-gray-600">학급 필터</label>
    <ClassSelector
      value={filterClassId}
      onChange={(id) => {
        setFilterClassId(id);
        setFilterStudentId('');
      }}
    />
  </div>
  {filterClassId && (
    <div>
      <label className="text-sm text-gray-600">학생 필터</label>
      <StudentSelector
        value={filterStudentId}
        onChange={setFilterStudentId}
        classId={filterClassId}
      />
    </div>
  )}
  {(filterClassId || filterStudentId) && (
    <button
      type="button"
      className="px-2 py-1 text-xs border rounded text-gray-600"
      onClick={() => { setFilterClassId(''); setFilterStudentId(''); }}
    >
      필터 초기화
    </button>
  )}
</div>
```

필터 state와 로직:

```tsx
const [filterClassId, setFilterClassId] = useState<string>('');
const [filterStudentId, setFilterStudentId] = useState<string>('');
const { data: filterStudents } = useStudents(filterClassId || undefined);

const filteredCounselings = useMemo(() => {
  let list = counselings ?? [];
  if (filterStudentId) {
    list = list.filter((cs) => cs.student_id === filterStudentId);
  } else if (filterClassId && filterStudents) {
    const studentIds = new Set(filterStudents.map((s) => s.id));
    list = list.filter((cs) => studentIds.has(cs.student_id));
  }
  return list;
}, [counselings, filterClassId, filterStudentId, filterStudents]);
```

목록 렌더링에서 `counselings`를 `filteredCounselings`로 교체.

- [x] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/CounselingPage.tsx
git commit -m "feat(counseling): 학급/학생별 필터 기능 추가"
```

---

## Task 8: 알림 페이지 - 빈 상태 메시지 및 헤더 뱃지

**심각도:** 중간 (#25, #26)

**Files:**
- Modify: `frontend/src/pages/NotificationsPage.tsx`

**현재 문제:**
- 알림이 없을 때 "전체 읽음 처리" 버튼만 있고 빈 상태 안내 없음
- (뱃지는 이미 `NotificationBell.tsx`에 구현되어 있음 - 코드 확인 결과 count > 0이면 빨간 뱃지 표시. 현재 알림 0개라 안 보이는 것이 정상)

- [x] **Step 1: 빈 상태 메시지 추가**

`frontend/src/pages/NotificationsPage.tsx` 수정:

```tsx
return (
  <div className="space-y-4">
    <h1 className="text-xl font-semibold">알림</h1>
    <button className="border px-3 py-1 rounded" onClick={() => markAll.mutate()}>
      전체 읽음 처리
    </button>
    {(!data || data.length === 0) ? (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">알림이 없습니다</p>
        <p className="text-sm mt-1">새로운 알림이 오면 여기에 표시됩니다.</p>
      </div>
    ) : (
      <ul className="space-y-2">
        {data.map((n) => (
          <li key={n.id} className={`border p-2 rounded ${n.is_read ? 'opacity-60' : ''}`}>
            <div className="text-xs text-gray-600">{new Date(n.created_at).toLocaleString()}</div>
            <div className="text-sm">{n.message}</div>
            {!n.is_read && (
              <button className="mt-1 text-blue-600 underline text-xs" onClick={() => markOne.mutate(n.id)}>읽음</button>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
```

- [x] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/NotificationsPage.tsx
git commit -m "fix(notifications): 알림 없을 때 빈 상태 메시지 표시"
```

---

## Task 9: 헤더 - "Student Manager" 중복 제거 및 현재 페이지명 표시

**심각도:** 낮음 (#6)

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`

**현재 문제:** 사이드바와 헤더 모두에 "Student Manager" 표시

- [x] **Step 1: Header에서 타이틀 제거**

`frontend/src/components/layout/Header.tsx`에서 "Student Manager" 텍스트 제거:

```tsx
<div className="flex items-center gap-2">
  <button
    type="button"
    className="md:hidden p-1.5 rounded border text-gray-600"
    aria-label="메뉴 열기"
    onClick={onToggleSidebar}
  >
    ☰
  </button>
</div>
```

모바일에서 사이드바가 닫혀있을 때 타이틀이 없으면 허전하므로, 모바일에서만 표시:

```tsx
<div className="flex items-center gap-2">
  <button
    type="button"
    className="md:hidden p-1.5 rounded border text-gray-600"
    aria-label="메뉴 열기"
    onClick={onToggleSidebar}
  >
    ☰
  </button>
  <div className="font-semibold truncate md:hidden">Student Manager</div>
</div>
```

- [x] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/layout/Header.tsx
git commit -m "fix(layout): 데스크톱 헤더에서 중복 타이틀 제거"
```

---

## Task 10: 로그인 페이지 - 접근성 개선 (라벨 추가)

**심각도:** 중간 (#27)

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`

**현재 문제:** input에 placeholder만 있고 `<label>` 없음. 값이 채워지면 어떤 필드인지 알기 어려움.

- [x] **Step 1: 라벨 추가**

`frontend/src/pages/LoginPage.tsx` 수정 - 각 input 위에 label 추가:

```tsx
<div>
  <label htmlFor="email" className="block text-sm text-gray-600 mb-1">이메일</label>
  <input
    id="email"
    className="border p-2 w-full rounded"
    placeholder="teacher@example.com"
    type="email"
    name="email"
    autoComplete="username email"
    {...pmAttrs}
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</div>
<div>
  <label htmlFor="password" className="block text-sm text-gray-600 mb-1">비밀번호</label>
  <input
    id="password"
    className="border p-2 w-full rounded"
    placeholder="비밀번호를 입력하세요"
    type="password"
    name="password"
    autoComplete="current-password"
    {...pmAttrs}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
  />
</div>
```

- [x] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/LoginPage.tsx
git commit -m "fix(login): 접근성 개선 - 입력 필드에 라벨 추가"
```

---

## Task 11: 학급 삭제 - confirm 다이얼로그 개선

**심각도:** 높음 (#15)

**Files:**
- Modify: `frontend/src/pages/StudentListPage.tsx`

**현재 문제:** 학급 삭제 버튼이 빨간 테두리로 학급 추가 옆에 위치. 오클릭 위험.

**참고:** 현재 코드를 확인하면 이미 `confirm()`을 사용하고 있고 데이터 존재 시 경고 메시지도 있음(라인 72-98). 따라서 confirm 로직은 이미 구현됨. 버튼 배치만 개선하면 됨.

- [x] **Step 1: 학급 삭제 버튼을 학급 관련 버튼 그룹에서 분리**

`frontend/src/pages/StudentListPage.tsx`에서 학급 삭제 버튼의 위치를 변경:
- 학급 선택/추가와 삭제 사이에 구분자(separator) 추가
- 또는 삭제 버튼을 드롭다운 메뉴 내부로 이동

간단한 방법: 삭제 버튼에 margin-left 추가하여 시각적 분리:

```tsx
// 학급 삭제 버튼에 ml-4 추가
<button
  className="px-2 py-1 text-sm border rounded text-red-700 border-red-300 disabled:opacity-50 ml-4"
  // ... 기존 속성 ...
>
  학급 삭제
</button>
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/pages/StudentListPage.tsx
git commit -m "fix(students): 학급 삭제 버튼 시각적 분리"
```

---

## Task 12: 피드백 페이지 - 학급 선택 상태 유지 개선

**심각도:** 중간 (#3 관련)

**Files:**
- Modify: `frontend/src/pages/FeedbackPage.tsx`

**현재 문제:** 페이지 진입 시 학급이 항상 초기화됨. 학생 목록에서 피드백으로 이동할 때 학급을 다시 선택해야 함.

**접근:** `localStorage`를 사용하여 마지막 선택한 학급 ID를 저장하고 복원. 또는 URL searchParams 사용.

- [x] **Step 1: FeedbackPage에서 localStorage로 학급 선택 유지**

`frontend/src/pages/FeedbackPage.tsx` 수정:

```tsx
// classId 초기값을 localStorage에서 복원
const [classId, setClassId] = useState<string>(() => {
  return localStorage.getItem('selectedClassId') ?? '';
});

// onChange에서 localStorage 저장
onChange={(id) => {
  setClassId(id);
  if (id) localStorage.setItem('selectedClassId', id);
  setForm((prev) => ({ ...prev, student_id: '' }));
  if (!id) {
    setShowForm(false);
    setEditingId(null);
  }
}}
```

- [x] **Step 2: StudentListPage, CounselingPage에도 동일 패턴 적용**

`frontend/src/pages/StudentListPage.tsx` - classId 변경 시 localStorage 저장:

```tsx
// select onChange에서
onChange={(e) => {
  setClassId(e.target.value);
  localStorage.setItem('selectedClassId', e.target.value);
}}
```

`frontend/src/pages/CounselingPage.tsx` - classId 초기값 복원:

```tsx
const [classId, setClassId] = useState<string>(() => {
  return localStorage.getItem('selectedClassId') ?? '';
});
```

- [x] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/pages/FeedbackPage.tsx frontend/src/pages/StudentListPage.tsx frontend/src/pages/CounselingPage.tsx
git commit -m "feat(class): 학급 선택 상태를 페이지 간 유지"
```

---

## 우선순위 요약

| 우선순위 | Task | 이슈 번호 | 영향도 |
|----------|------|-----------|--------|
| 1 | Task 1: 대시보드 학생이름/한국어 카테고리 | #11, #12, #13 | 높음 |
| 2 | Task 5: 상담 기록 학생 이름 | #24 | 높음 |
| 3 | Task 6: 상담 기록 삭제 | #5 | 높음 |
| 4 | Task 3: 학생 행 클릭 상세 | #1 | 높음 |
| 5 | Task 7: 상담 기록 필터 | #23 | 높음 |
| 6 | Task 11: 학급 삭제 버튼 분리 | #15 | 높음 |
| 7 | Task 2: 대시보드 카드 링크 | #10 | 중간 |
| 8 | Task 4: 엑셀 표기 통일 | #17 | 중간 |
| 9 | Task 8: 알림 빈 상태 | #25, #26 | 중간 |
| 10 | Task 9: 헤더 중복 제거 | #6 | 낮음 |
| 11 | Task 10: 로그인 라벨 | #27 | 중간 |
| 12 | Task 12: 학급 선택 유지 | #3 | 중간 |

---

## 범위 밖 (추후 고려)

아래 항목은 더 큰 설계 변경이 필요하여 이번 계획에서 제외:

- #7: 사이드바에 사용자 프로필 영역 추가
- #8: 페이지 전환 스켈레톤 UI
- #14: 대시보드 레이아웃 재설계
- #18: 생년월일 date picker 한국식 포맷
- #19: 출결 인라인 편집 기능
- #20, #21: 피드백 작성 폼 UX 리디자인
- #22: 카테고리 배지 색상 범례
- #28: 비밀번호 표시/숨기기 토글
