# US-005 구현 점검 및 보완 계획

## 대상 스토리

**US-005: 학생/학부모 — 성적 및 피드백 조회**

- 로그인 후 본인(자녀) 데이터만 조회된다
- 학기별 성적·등급·레이더 차트를 조회할 수 있다
- 교사가 공개 설정한 피드백만 표시된다
- 모바일 브라우저에서도 동일한 기능이 작동한다

## 현재 점검 결과

### 확인된 구현

- Backend
  - `GET /api/v1/my/students`, `GET /api/v1/my/grades`, `GET /api/v1/my/grades/summary`, `GET /api/v1/my/subjects`, `GET /api/v1/my/feedbacks`가 존재한다.
  - 학생은 자신의 `Student.user_id`로만 조회되고, 학부모는 `ParentStudent` 연결이 있는 자녀만 조회 가능하다.
  - `GET /api/v1/semesters`는 인증된 사용자 누구나 조회 가능하도록 확장되어 있다.
  - 피드백은 학생/학부모 역할에 따라 `is_visible_to_student`, `is_visible_to_parent` 조건으로 필터링된다.

- Frontend
  - `frontend/src/pages/StudentHomePage.tsx`에 학생용 학기 선택, 성적 표, 등급, 레이더 차트, 피드백 영역이 있다.
  - `frontend/src/pages/ParentHomePage.tsx`에 자녀 선택, 학기 선택, 성적 표, 등급, 레이더 차트, 피드백 영역이 있다.
  - 두 화면 모두 `grid grid-cols-1 md:*`, `overflow-x-auto`를 사용해 반응형 레이아웃을 의도하고 있다.

### 직접 확인한 동작

- 학생 토큰으로 `/api/v1/my/grades?student_id=<타학생>` 호출 시, 타학생 데이터가 아니라 본인 데이터만 반환되는 것을 확인했다.
- 학부모 토큰으로 연결되지 않은 자녀의 `/api/v1/my/grades` 호출 시 `403 { detail, code }`가 반환되는 것을 확인했다.
- 학생 `/api/v1/my/feedbacks`는 학생 공개 피드백만, 학부모 `/api/v1/my/feedbacks?student_id=<자녀>`는 학부모 공개 피드백만 반환되는 것을 확인했다.
- 학생/학부모 모두 `/api/v1/semesters` 조회가 가능함을 확인했다.

## 판단

**핵심 읽기 기능은 구현되어 있고, 남은 건 세부 UX와 검증 보강이다.**

다만 아래 항목은 아직 폴리시 또는 검증 보강 대상으로 남겨두는 편이 좋다.

1. 학생/학부모 화면의 공개 피드백 조회가 현재 `limit: 5`로 제한되어 있다.
2. 학생/학부모 전용 화면에 대한 자동화 테스트가 없다.
3. 모바일 브라우저 실사용 검증 또는 뷰포트 기반 테스트가 없다.
4. `/student`, `/parent` 라우트가 역할별로 강제 보호되지 않아 잘못된 역할 접근 시 비정상 흐름이 가능하다.

## 확인된 갭

### 갭 1 — 공개 피드백이 최근 5건만 노출됨

- `StudentHomePage`는 `listMyFeedbacks({ limit: 5 })`를 호출한다.
- `ParentHomePage`도 `listMyFeedbacks({ student_id, limit: 5 })`를 호출한다.
- 스토리의 "언제든지 조회" 관점에서는 전체 공개 피드백 접근성이 부족하다.

### 갭 2 — 역할별 화면 보호가 느슨함

- 현재 `ProtectedRoute`는 인증만 검사하고 역할은 검사하지 않는다.
- 잘못된 역할이 `/student` 또는 `/parent`로 직접 진입하면 일부 API가 400/403으로 깨질 수 있다.

### 갭 3 — 검증 부족

- Backend 테스트에는 `/my/*` 읽기 API 전용 권한/가시성 테스트가 없다.
- Frontend 테스트에는 `StudentHomePage`, `ParentHomePage` 렌더링/데이터 필터링/학기 전환/차트 표시 테스트가 없다.
- 모바일 레이아웃에 대한 자동화 또는 수동 QA 기록이 없다.

## 구현 계획

### 1) Backend 읽기 API 회귀 테스트 추가

- [x] `backend/tests/test_my.py` 추가
- [x] 학생이 자신의 성적만 조회 가능한지 검증
- [x] 학생이 `student_id`를 조작해도 타학생 데이터가 노출되지 않는지 검증
- [x] 학부모가 연결된 자녀만 조회 가능한지 검증
- [x] 학기 필터가 성적/요약에 정확히 반영되는지 검증
- [x] 학생/학부모별 공개 피드백 필터가 정확한지 검증

### 2) Frontend 학생/학부모 조회 UX 보완

- [x] 학생/학부모 화면에서 공개 피드백 `limit: 5` 제거 또는 "전체 보기" 흐름 추가
- [x] 피드백이 많을 때도 조회 가능한 UI 제공
- [x] 빈 상태와 로딩 상태를 학생/학부모 화면에 명시
- [ ] 에러 상태를 학생/학부모 화면에 명시

### 3) 역할별 라우트 보호 강화

- [x] 역할 기반 라우트 가드 추가 (`student`는 `/student`, `parent`는 `/parent`만 정상 진입)
- [x] 잘못된 역할 접근 시 적절한 홈 경로로 리다이렉트

### 4) Frontend 자동화 테스트 추가

- [x] `frontend/src/__tests__/pages/StudentHomePage.test.tsx` 추가
- [x] `frontend/src/__tests__/pages/ParentHomePage.test.tsx` 추가
- [x] 학기 변경 시 성적/요약/차트 데이터가 바뀌는지 검증
- [x] 학생/학부모별 피드백 필터링 결과가 올바른지 검증
- [x] 자녀 선택 변경 시 부모 화면 데이터가 바뀌는지 검증

### 5) 모바일 검증

- [x] 최소 375px 폭 기준으로 학생/학부모 화면 수동 QA
- [x] 학기 선택, 자녀 선택, 표 가로 스크롤, 레이더 차트, 피드백 목록 동작 확인
- [x] 가능하면 Playwright 뷰포트 시나리오 1개 이상 추가

## 완료 기준

- 공개 피드백이 5건 제한 없이 조회 가능하거나, 전체 조회 진입점이 제공된다.
- 학생/학부모가 잘못된 경로에 진입해도 기능이 깨지지 않는다.
- `/my/*` 읽기 API 권한/가시성 테스트가 추가된다.
- 학생/학부모 홈 화면 테스트가 추가된다.
- 모바일 뷰포트에서 동일 기능 확인 결과가 기록된다.

## 우선순위

1. Backend 권한/가시성 테스트
2. 피드백 전체 조회 보완
3. 역할 기반 라우트 보호
4. Frontend 화면 테스트
5. 모바일 QA/뷰포트 검증
