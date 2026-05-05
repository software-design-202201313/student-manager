# Student Manager

학생 성적·상담 통합 관리 웹앱. FastAPI 백엔드 + React/Vite 프론트엔드.

## Quick Start

```bash
docker compose up --build
```

- 프론트엔드: `http://localhost:5173`
- 백엔드 / Swagger: `http://localhost:18000` / `http://localhost:18000/docs`
- Kafka (KRaft 단일 노드): 컨테이너 내부 `kafka:9092`, 호스트 `localhost:29092`
- 기본 교사 계정: `teacher@example.com` / `password123`

로컬 QA 실행:

```bash
npm run qa
```

백엔드 `ruff` + `pytest`, 프론트엔드 `tsc --noEmit`을 순서대로 실행합니다.

## 인증

- 액세스 토큰은 브라우저 메모리, 리프레시 토큰은 `HttpOnly` 쿠키로 관리합니다.
- 회원가입은 초대 링크 기반입니다. 교사가 학생/학부모를 초대하면 `/signup?token=...` 링크가 생성됩니다.
- `AUTH_LINK_DELIVERY=stub`(기본값)은 개발용이며, 운영에서는 SMTP 설정이 필요합니다.

## 데이터 가져오기 / 내보내기

- 학생 일괄 등록: CSV 또는 XLSX 업로드
- 성적 일괄 등록: CSV 또는 XLSX 업로드
- 상담 상세 페이지에서 PDF 리포트 내보내기 지원

## CI/CD

`main` 브랜치에 push하면 CI(lint + test + typecheck) → CD(Vercel 프론트 + Render 백엔드) 순으로 자동 배포됩니다.

필요한 GitHub Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RENDER_API_KEY`, `RENDER_SERVICE_ID`
