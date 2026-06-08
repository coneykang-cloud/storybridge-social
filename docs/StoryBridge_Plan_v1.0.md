# StoryBridge 구현 계획 (Implementation Plan)

**버전:** v1.0  
**작성일:** 2026.06.04  
**작성자:** 강현정  
**참조:** PRD v1.0 / HLD v1.0 / LLD v1.0

---

## 전체 타임라인

```
W1  W2  W3  W4  W5  W6  W7  W8  W9  W10  W11  W12
│──────│  기반 설정 + 디자인 시스템
      │──────│  인증 + 아동 프로필 + 아바타 스튜디오
            │──────│  AI 스토리 생성 파이프라인
                  │──────│  스토리 뷰어 + TTS
                        │──────│  Story Pool + 협업/승인
                              │──────────│  QA + 배포 준비
```

---

## Phase 1: W1~2 — 기반 설정 + 디자인 시스템

### 목표
- Next.js 14 프로젝트 초기화
- Supabase 설정 (Auth, DB, Storage)
- 디자인 시스템 컴포넌트 구축
- DB 스키마 마이그레이션

### 태스크 목록

#### 1-1. 프로젝트 초기화
- [ ] `npx create-next-app@latest storybridge --typescript --tailwind --app`
- [ ] 의존성 설치: `@supabase/supabase-js`, `@supabase/ssr`, `zustand`, `openai`, `@google-cloud/text-to-speech`, `lucide-react`, `clsx`, `tailwind-merge`
- [ ] Pretendard 폰트 추가 (`public/fonts/`)
- [ ] `tailwind.config.ts` 디자인 토큰 설정 (색상, 폰트, 간격)
- [ ] `.env.local` 환경 변수 설정
- [ ] `next.config.ts` 이미지 도메인 허용 설정

#### 1-2. 디자인 시스템 컴포넌트
- [ ] `Button.tsx` — 기본/프라이머리/아웃라인, 48px 최소 터치 영역
- [ ] `Card.tsx` — 16px 라운드, 그림자
- [ ] `Badge.tsx` — 역할 배지 (보호자/치료사/선생님), 알림 배지
- [ ] `Input.tsx` — 기본 입력, 텍스트에어리어
- [ ] `Modal.tsx` — 바텀 시트 (모바일), 센터 모달 (데스크톱)
- [ ] `HighContrastToggle.tsx` — 고대비 모드 전환
- [ ] `BottomNavBar.tsx` — 모바일 하단 5탭 네비게이션
- [ ] `SideBar.tsx` — 태블릿/데스크톱 좌측 사이드바

#### 1-3. Supabase 설정
- [ ] Supabase 프로젝트 생성
- [ ] DB 마이그레이션 파일 작성 (`supabase/migrations/`)
  - [ ] `001_user_profiles.sql`
  - [ ] `002_children.sql`
  - [ ] `003_avatars.sql`
  - [ ] `004_groups.sql`
  - [ ] `005_stories.sql`
  - [ ] `006_story_pages.sql`
  - [ ] `007_story_pool.sql`
  - [ ] `008_approvals.sql`
  - [ ] `009_comments.sql`
  - [ ] `010_rls_policies.sql`
- [ ] Storage 버킷 생성 (`avatars`, `story-images`, `tts-cache`)
- [ ] `supabase gen types typescript` → `types/database.types.ts`
- [ ] Supabase 클라이언트 설정 (`lib/supabase/client.ts`, `server.ts`)
- [ ] Middleware 설정 (세션 갱신)

#### 1-4. Story Pool 시드 데이터
- [ ] 18개 템플릿 JSON 작성 (3 연령대 × 2 카테고리 × 3개)
- [ ] `supabase/seed.sql` 작성 및 실행

---

## Phase 2: W3~4 — 인증 + 아동 프로필 + 아바타 스튜디오

### 목표
- 온보딩 플로우 완성
- 아동 프로필 CRUD
- DALL·E 3 아바타 생성 완성

### 태스크 목록

#### 2-1. 인증 플로우
- [ ] `/signup` — 역할 선택 + 이메일/PW 가입 UI
- [ ] `/signin` — 로그인 UI
- [ ] Supabase Auth 훅 연동 (`useAuth` 커스텀 훅)
- [ ] 역할별 리다이렉트 로직 (미들웨어)
- [ ] `auth.store.ts` Zustand 스토어

#### 2-2. 아동 프로필
- [ ] 온보딩 스텝 1: 아동 이름, 생년, 관심사, 친숙 환경 입력
- [ ] `/api/children` POST/GET 라우트
- [ ] `child.store.ts` Zustand 스토어
- [ ] 대시보드 아동 선택 UI

#### 2-3. 아바타 스튜디오
- [ ] 사진 업로드 컴포넌트 (드래그앤드롭 + 터치 친화적)
- [ ] Supabase Storage 임시 업로드 (`avatars/temp/`)
- [ ] 스타일 선택 4종 UI (카드 그리드)
- [ ] `/api/avatar/generate` POST 라우트 → DALL·E 3 비동기 요청
- [ ] 생성 진행 상태 폴링 UI (애니메이션)
- [ ] 아바타 라이브러리 UI (최대 5개, 삭제/기본 설정)
- [ ] `AvatarStudio.tsx`, `AvatarCard.tsx`, `StyleSelector.tsx` 컴포넌트

---

## Phase 3: W5~6 — AI 스토리 생성 파이프라인

### 목표
- 자유 줄글 → 소셜 스토리 완전 자동 생성
- 6WH 가이드 + 후속 질문
- 인라인 편집 + 재생성

### 태스크 목록

#### 3-1. 스토리 생성 UI
- [ ] 자유 줄글 입력창 (대형 텍스트에어리어)
- [ ] 6WH 체크리스트 가이드 컴포넌트 (`SixWHGuide.tsx`)
- [ ] 예시 문구 선택 버튼 4종 (자동 삽입)
- [ ] 청킹 방식 선택 (`ChunkingSelector.tsx`)
- [ ] 아바타 선택 드롭다운

#### 3-2. AI 생성 API
- [ ] `/api/story/generate` SSE 스트리밍 라우트
  - [ ] STAGE 1: GPT-4o 6WH 추출
  - [ ] 6WH 누락 감지 → `event: clarify` 응답
  - [ ] STAGE 2: GPT-4o 소셜스토리 생성 (스트리밍)
  - [ ] 각 페이지 DALL·E 3 이미지 병렬 생성
  - [ ] Supabase 저장
- [ ] Carol Gray 10.4 비율 검증 유틸 (`carol-gray.ts`)
- [ ] `story.store.ts` 스트리밍 상태 관리

#### 3-3. 스토리 편집 UI
- [ ] 페이지별 카드 레이아웃 (이미지 + 3종 문장)
- [ ] 인라인 편집 (클릭 → 텍스트에어리어 전환)
- [ ] 페이지 "다시 생성" 버튼
- [ ] 이미지 교체 기능
- [ ] 저장 → 공유 플로우

---

## Phase 4: W7~8 — 스토리 뷰어 + TTS

### 목표
- 3모드 뷰어 완성 (Manual/Auto Play/Slideshow)
- Google Cloud TTS 연동
- 단어 하이라이트 동기화

### 태스크 목록

#### 4-1. 스토리 뷰어
- [ ] `StoryViewer.tsx` 기본 구조
- [ ] 스와이프 제스처 (모바일)
- [ ] Manual 모드: 탭/화살표 전환
- [ ] Auto Play 모드: TTS 완료 후 자동 진행
- [ ] Slideshow 모드: 타이머 (3/5/7초) 설정 UI
- [ ] 고대비 모드 적용
- [ ] 홈 버튼 복귀

#### 4-2. TTS 연동
- [ ] `/api/tts` GET 라우트
- [ ] Google Cloud TTS Neural2 클라이언트 (`lib/tts/google.ts`)
- [ ] Supabase Storage 캐싱 로직
- [ ] 음성 선택 UI (남성/여성/아동)
- [ ] `TTSController.tsx` 재생/일시정지 컨트롤

#### 4-3. 단어 하이라이트
- [ ] Google TTS `timepoints` API 활용
- [ ] Web Audio API 재생 위치 동기화
- [ ] 하이라이트 CSS 애니메이션

---

## Phase 5: W9~10 — Story Pool + 협업/승인

### 목표
- Story Pool 탐색 + 커스터마이징
- 그룹 초대 + 실시간 협업
- 수정 제안 + 승인 플로우

### 태스크 목록

#### 5-1. Story Pool
- [ ] Pool 탐색 UI (연령대 × 카테고리 필터)
- [ ] 템플릿 카드 그리드
- [ ] `/api/pool` GET 라우트
- [ ] 템플릿 선택 → 아동 프로필 커스터마이징 (GPT-4o)
- [ ] Pool 기반 스토리 저장

#### 5-2. 협업 그룹
- [ ] `/api/group` POST (그룹 생성, 초대 코드 발급)
- [ ] 초대 코드 입력 → 그룹 참여 UI
- [ ] 그룹 멤버 목록 화면
- [ ] Supabase Realtime 채널 연결 (`collab.store.ts`)

#### 5-3. 승인 플로우
- [ ] 치료사/선생님 "수정 제안" 편집 모드 UI
- [ ] `/api/approval` POST 라우트
- [ ] 보호자 "승인 대기" 배지 + 알림
- [ ] DiffViewer 컴포넌트 (before/after)
- [ ] 승인/거절 인터랙션
- [ ] 승인 히스토리 조회

#### 5-4. 자문 댓글
- [ ] 스토리 레벨 댓글 작성 UI
- [ ] 페이지 레벨 댓글 (말풍선 아이콘)
- [ ] 읽음 확인 (✓ / ✓✓)
- [ ] 실시간 댓글 업데이트

---

## Phase 6: W11~12 — QA + 배포 준비

### 목표
- 반응형 QA (Mobile/Tablet/Desktop)
- 성능 최적화
- 베타 테스트 + 버그 수정
- Vercel 프로덕션 배포

### 태스크 목록

#### 6-1. 반응형 QA
- [ ] Mobile (360px): 모든 페이지 점검
- [ ] Tablet (768px): 2컬럼 레이아웃 점검
- [ ] Desktop (1280px): 3컬럼 레이아웃 점검
- [ ] 고대비 모드 전체 점검
- [ ] 터치 영역 48px 기준 점검

#### 6-2. 성능 최적화
- [ ] 이미지 `next/image` 최적화
- [ ] TTS 캐싱 효율화
- [ ] Supabase 쿼리 최적화 (인덱스 추가)
- [ ] 번들 사이즈 분석 (`@next/bundle-analyzer`)

#### 6-3. 베타 테스트
- [ ] 보호자 5명 UX 테스트
- [ ] 치료사 2명 협업 플로우 테스트
- [ ] 스토리 생성 10분 이내 완성 KPI 측정
- [ ] 버그 이슈 트래킹 + 수정

#### 6-4. 배포
- [ ] Vercel 프로덕션 환경 설정
- [ ] Supabase 프로덕션 RLS 최종 검증
- [ ] 도메인 연결
- [ ] 모니터링 설정 (Vercel Analytics)

---

## 의존성 그래프

```
Phase 1 (기반)
    └── Phase 2 (인증/프로필)
            ├── Phase 3 (AI 생성) ─── Phase 4 (뷰어/TTS)
            └── Phase 5 (협업)
                        └── Phase 6 (QA/배포)
```

---

## 리스크 및 완화 방안

| 리스크 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| DALL·E 3 응답 속도 느림 | 높음 | 중 | 비동기 폴링 + 로딩 UX |
| GPT-4o Carol Gray 비율 미준수 | 중 | 높음 | 생성 후 자동 검증 + 재생성 |
| Supabase Realtime 연결 불안정 | 낮음 | 중 | 재연결 로직 + 폴백 폴링 |
| Google TTS 한국어 발음 오류 | 낮음 | 중 | 사용자 직접 녹음 (v2) |
| 아동 사진 개인정보 침해 | 낮음 | 높음 | 비공개 Storage, 보호자 동의 |

---

*StoryBridge Plan v1.0 | 2026.06.04*
