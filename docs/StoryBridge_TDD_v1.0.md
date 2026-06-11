# StoryBridge Technical Design Document (TDD)

**버전:** v1.6  
**작성일:** 2026.06.05 / 최종 업데이트: 2026.06.11  
**작성자:** 강현정  
**참조:** PRD v3.6 / HLD v2.6 / LLD v2.7 / Plan v2.7

---

## 목차

1. [기술 개요](#1-기술-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [기술 스택 상세](#3-기술-스택-상세)
4. [프론트엔드 설계](#4-프론트엔드-설계)
5. [백엔드 API 설계](#5-백엔드-api-설계)
6. [데이터베이스 설계](#6-데이터베이스-설계)
7. [AI 파이프라인 설계](#7-ai-파이프라인-설계)
8. [인증 및 보안 설계](#8-인증-및-보안-설계)
9. [실시간 통신 설계](#9-실시간-통신-설계)
10. [파일 스토리지 설계](#10-파일-스토리지-설계)
11. [성능 및 최적화](#11-성능-및-최적화)
12. [배포 아키텍처](#12-배포-아키텍처)
13. [에러 처리 전략](#13-에러-처리-전략)
14. [환경 변수 명세](#14-환경-변수-명세)
15. [기술적 제약 및 한계](#15-기술적-제약-및-한계)

---

## 1. 기술 개요

### 1.1 시스템 목적

StoryBridge는 ASD(자폐 스펙트럼 장애) 아동을 위한 AI 기반 소셜 스토리 생성 플랫폼이다. 보호자·치료사·교사 3자가 협업하여 Carol Gray Social Stories™ 10.4 기준을 준수하는 개인화된 소셜 스토리를 생성·공유·관리한다.

### 1.2 핵심 기술 요구사항

| 요구사항 | 기술 솔루션 |
|---|---|
| 실시간 AI 스토리 생성 스트리밍 | OpenAI GPT-4o + SSE (Server-Sent Events) |
| 아동 아바타 생성 | OpenAI DALL·E 2 (실패 시 Dicebear 폴백) — ★ v1.4: PhotoMaker(사진 기반 개인화)는 미구현 |
| 페이지 일러스트 생성 | Replicate FLUX Schnell/Kontext Pro — 등록 아바타 있으면 캐릭터 일관성 유지 (★ v1.4: 2026.06 Pollinations.ai → 전환) |
| 3자 실시간 협업 알림 | Supabase Realtime (WebSocket) |
| 역할 기반 접근 제어 | Supabase RLS + JWT 기반 인증 |
| 모바일 퍼스트 반응형 UI | Next.js 16 + Tailwind CSS |
| 한국어 TTS 음성 읽기 | Google Cloud TTS Neural2 |
| 오프라인 없이 웹 전용 | Next.js App Router (SSR/CSR 혼합) |

### 1.3 기술 결정 원칙

- **서버 우선(Server-First):** 민감 데이터·AI API 키는 서버 사이드에서만 처리
- **점진적 향상:** 핵심 기능은 JS 없이도 동작, AI 기능은 점진적 적용
- **RLS 전면 적용:** 모든 DB 접근에 Row Level Security 적용으로 데이터 격리
- **Fail-Safe AI:** AI 실패 시 Fallback 제공 (DALL·E 2 아바타 생성 실패 → Dicebear; ★ v1.4: 페이지 일러스트(Replicate FLUX)는 페이지별 try/catch로 흡수하되 별도 이미지 폴백은 없음)

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                 │
│  Next.js 16 App Router (React 18, Turbopack)         │
│  ├── Server Components (데이터 페칭, SEO)              │
│  └── Client Components (상태, 인터랙션, Realtime)      │
├─────────────────────────────────────────────────────┤
│                    API LAYER                         │
│  Next.js Route Handlers (Node.js Runtime)            │
│  ├── /api/auth/*      인증 (Admin API)               │
│  ├── /api/story/*     스토리 생성·관리                 │
│  ├── /api/avatar/*    아바타 생성·관리                 │
│  ├── /api/tts         음성 합성                       │
│  ├── /api/approval    승인 플로우                      │
│  ├── /api/comment     자문 댓글                        │
│  └── /api/group       협업 그룹                       │
├─────────────────────────────────────────────────────┤
│                  EXTERNAL SERVICES                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │Supabase  │ │ OpenAI   │ │Replicate │ │Google  │  │
│  │Auth/DB/  │ │ GPT-4o   │ │FLUX      │ │TTS     │  │
│  │Realtime/ │ │ DALL-E 2 │ │Schnell/  │ │Neural2 │  │
│  │Storage   │ │(아바타)  │ │KontextPro│ │        │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
└─────────────────────────────────────────────────────┘
```

> **정정 (2026-06-08, v1.4):** Replicate 박스를 "PhotoMaker"(미구현, §7.4 참고) → "FLUX Schnell/Kontext Pro"(페이지 일러스트 생성, §5.4)로 교체. OpenAI 박스에는 DALL·E 2가 아동 아바타 생성(§5.5)에만 쓰인다는 점을 명시 — 2026.06 이전엔 페이지 이미지에 Pollinations.ai를 사용했으나 x402 결제 프로토콜 도입으로 서비스 중단되어 Replicate FLUX로 전환했다.

### 2.2 요청 처리 흐름

```
브라우저 요청
    │
    ▼
proxy.ts (Next.js 16 Proxy — 구 middleware)
    │ 세션 갱신 + 미인증 리다이렉트
    ▼
Server Component 또는 API Route Handler
    │ createClient() — 서버 Supabase 클라이언트
    ▼
비즈니스 로직 + RLS 적용된 Supabase 쿼리
    │
    ▼
외부 AI 서비스 (필요 시)
    │
    ▼
응답 반환 (JSON / SSE / HTML)
```

---

## 3. 기술 스택 상세

### 3.1 프론트엔드

| 기술 | 버전 | 용도 |
|---|---|---|
| Next.js | 16.2.7 | App Router, SSR/CSR, Turbopack |
| React | 18.3.x | UI 렌더링 |
| TypeScript | 5.5.x | 타입 안전성 |
| Tailwind CSS | 3.4.x | 유틸리티 스타일링 |
| Zustand | 4.5.x | 클라이언트 상태관리 |
| lucide-react | 0.436.x | 아이콘 |
| react-dropzone | 14.2.x | 파일 드롭존 |

### 3.2 백엔드 / 인프라

| 기술 | 버전 | 용도 |
|---|---|---|
| Supabase | 2.45.x | Auth, PostgreSQL, Realtime, Storage |
| OpenAI SDK | 4.55.x | GPT-4o/GPT-4o-mini 스토리·제목·SEAT 분석, DALL·E 2 아동 아바타 생성 |
| Replicate | latest | FLUX Schnell/Kontext Pro 페이지 일러스트 생성 ★ v1.4: PhotoMaker→FLUX (2026.06 Pollinations.ai 중단으로 전환) |
| Google Cloud TTS | 5.5.x | 한국어 Neural2 음성 합성 |
| Vercel | — | 배포, Edge Network, CI/CD |

### 3.3 개발 환경

```
Node.js: v24.16.0
npm: v11.x
OS: Windows 11 Pro
IDE: VSCode / Claude Code
```

---

## 4. 프론트엔드 설계

### 4.1 라우팅 구조

```
/                           루트 → 인증 상태에 따라 리다이렉트
├── /signin                 로그인
├── /signup                 회원가입 (역할 선택 → 계정 정보)
├── /dashboard              홈 대시보드
├── /avatar-studio          아바타 스튜디오
├── /profile                아동 프로필 관리 (NEW v1.1)
├── /onboarding/child       아동 프로필 등록
├── /story/
│   ├── /create             Track 자동 분기 (역할별 redirect)
│   ├── /create/therapist   Track A — 치료사 주도
│   ├── /create/parent      Track B — 보호자 주도
│   ├── /create/teacher     Track C — 교사 주도
│   ├── /create/pool        템플릿 선택
│   ├── /[id]               스토리 상세
│   └── /[id]/view          스토리 뷰어 (3모드)
├── /collab                 협업 공간 목록 (child 접근 차단)
├── /collab/[groupId]       그룹 협업 (승인·댓글, child 접근 차단)
├── /bookshelf              브릿지 책장 (child 전용 진입점 포함)
└── /settings               설정 (로그아웃, 고대비)

> **v1.5 child 역할 접근 경로:** `/bookshelf`, `/settings`, `/story/[id]`(읽기 전용) — 그 외는 미들웨어에서 `/bookshelf`로 강제 리다이렉트. `/story/create`는 CHILD_BLOCKED 목록으로 명시적 차단.
```

### 4.2 렌더링 전략

| 페이지 | 렌더링 | 이유 |
|---|---|---|
| dashboard | SSR | 최신 데이터 필요, SEO 불필요 |
| story/[id]/view | SSR | 스토리 내용 서버에서 페칭 |
| story/create/* | CSR | AI 스트리밍, 인터랙티브 |
| avatar-studio | SSR + CSR | 초기 데이터 SSR, 업로드는 CSR |
| signin/signup | Static | 인증 전 정적 |

### 4.3 상태 관리 (Zustand)

```typescript
// 스토어 분리 원칙
auth.store.ts         — 인증 사용자 정보
child.store.ts        — 선택된 아동 프로필
story.store.ts        — 스토리 생성 상태, 스트리밍 진행
collab.store.ts       — group:{groupId} Realtime 채널, 승인 목록(approvals) + 승인 내역(approvalHistory), 댓글
notification.store.ts — notifications:{userId} Realtime 채널, 알림 목록·unreadCount, markAsRead/markAllAsRead — NEW v1.6
ui.store.ts           — 고대비 모드, 뷰어 설정 (localStorage 영속)
```

### 4.4 컴포넌트 설계 원칙

- **Server Component 기본:** 데이터 페칭은 서버 컴포넌트에서
- **`'use client'` 최소화:** 상호작용이 필요한 리프 노드에만 적용
- **Props Drilling 방지:** 깊은 트리는 Zustand 스토어 활용
- **접근성:** 모든 버튼 최소 48px, 고대비 모드 지원

### 4.5 DiffViewer — LCS 기반 단어 단위 diff (NEW v1.6)

```typescript
// 1. 공백을 보존하며 단어 단위로 토큰화
function tokenize(text: string): string[] {
  return text.split(/(\s+)/)
}

// 2. LCS(최장 공통 부분열) DP 테이블로 토큰을 equal/remove/add로 분류
function diffTokens(before: string[], after: string[]): DiffToken[] {
  // dp[i][j] = before[i:]와 after[j:]의 LCS 길이
  // 역추적하며 일치 토큰은 'equal', before에만 있으면 'remove',
  // after에만 있으면 'add'로 태깅
}
```

- 변경 전(`diff_before`)과 변경 후(`diff_after`)의 각 필드(`descriptive`/`perspective`/`coaching`)를 토큰화 후 LCS로 비교
- 좌측 컬럼: `equal` + `remove` 토큰 (삭제된 단어는 취소선 강조), 우측 컬럼: `equal` + `add` 토큰 (추가된 단어는 하이라이트)
- 문단 전체를 단순 비교하던 기존 방식과 달리, **달라진 단어/구절만** 시각적으로 구분되어 ApprovalCard/ApprovalHistoryCard에서 변경 범위를 빠르게 파악 가능

---

## 5. 백엔드 API 설계

### 5.1 API 설계 원칙

- **RESTful:** 리소스 중심 URL, 표준 HTTP 메서드
- **서버 검증:** 모든 입력값 서버 사이드에서 재검증
- **역할 검증:** API 레이어에서 role + RLS 이중 검증
- **에러 일관성:** `{ error: string }` 형식의 한국어 에러 메시지

### 5.2 인증 API 특이사항

```typescript
// Admin API 사용 이유:
// - Supabase email rate limit 우회 (시간당 4건 제한)
// - 이메일 확인 없이 즉시 활성화 (개발 단계)
// - 치료사·선생님 연락처 서버 검증 포함

POST /api/auth/signup
  body: { email, password, full_name, role, phone? }
  → supabase.auth.admin.createUser({ email_confirm: true })
  → user_profiles.upsert({ role, phone })
```

### 5.3 스토리 생성 SSE 스트리밍

```
POST /api/story/generate
Content-Type: application/json
→ Response: text/event-stream

이벤트 형식:
  event: page   → 페이지 1개 완성될 때마다
  event: clarify → 6WH 누락 시 후속 질문
  event: done   → 전체 완료
  event: error  → 오류 발생

STAGE 1: GPT-4o → 6WH 추출 (JSON)
STAGE 2: GPT-4o → 소셜스토리 생성 (스트리밍)
STAGE 3: 이미지 생성 — Replicate FLUX, 페이지별 순차(for...await, 병렬 아님) ★ v1.4 정정
STAGE 4: DB 저장
```

> **정정 (2026-06-08, v1.4):** "이미지 생성 (병렬)"로 기술돼 있었으나 실제 코드(`generate/route.ts`)는 페이지를 `for...await` 루프로 한 장씩 순차 생성한다. HLD §3.1, LLD §5.3과 동일하게 정정.

### 5.4 페이지 일러스트 생성 — Replicate FLUX (2026.06 Pollinations.ai → 전환, v1.4 전면 재작성)

```
generateStoryPageImage(imagePrompt, avatarStyle, avatarImageUrl)

분기 1 — avatarImageUrl 있음 (아동 기본 아바타 등록됨):
  → black-forest-labs/flux-kontext-pro (이미지 조건부 편집)
  → "Place this exact same character into a new scene: ..." 프롬프트
  → 페이지마다 얼굴·헤어·옷차림 일관 유지 (캐릭터 일관성)

분기 2 — avatarImageUrl 없음 (폴백):
  → black-forest-labs/flux-schnell (텍스트→이미지)
  → 장당 약 $0.003, 약 0.6초

(공통) 결과 { buffer, contentType } → saveImageBuffer로 Storage 업로드
```

> **전환 배경:** Pollinations.ai가 x402 결제 프로토콜을 도입하며 "Queue full for IP" 402 에러가 상시 발생해 사용 불가 판정 → 유료지만 저렴하고 빠른 FLUX 계열로 전면 전환. 이어서 "등록된 아이 프로필로 이미지를 생성해줬으면 좋겠다"는 요청에 따라 아바타 조건부 편집(`flux-kontext-pro`) 분기를 추가해 캐릭터 일관성을 확보했다 (LLD §5.3 상세).

### 5.5 아동 아바타 이미지 생성 — DALL·E 2 + Dicebear 폴백 (실제 코드 기준 정정, v1.4)

```
generateAvatarImage(style, age, name)

1순위: OpenAI DALL·E 2 (model: 'dall-e-2', size: 512x512)
       → 스타일별 프롬프트(AVATAR_STYLE_PROMPTS) 기반 생성

2순위: Dicebear (실패 시 폴백, buildDicebearUrl)
       → 스타일별 컬렉션 매핑(adventurer/personas/big-smile/adventurer-neutral)
       → 이름 seed 기반, 즉시 생성·개인화 없음
```

> **정정 (2026-06-08, v1.4):** 기존엔 "1순위 Replicate PhotoMaker(사진 기반 개인화) → 2순위 DALL-E 2 → 3순위 Dicebear" 3단계로 기술돼 있었으나, 실제 `generateAvatarImage()`(`lib/openai/avatar.ts`) 코드에는 PhotoMaker 연동이 없다 — DALL·E 2 생성 실패 시 바로 Dicebear로 폴백하는 2단계 구조다. §7.4의 PhotoMaker 연동 상세 역시 같은 사유로 "미구현/계획 단계" 주석을 추가했다(아래 §7.4 참고). 페이지 일러스트(스토리 본문 이미지) 생성은 §5.4의 별도 파이프라인(Replicate FLUX)을 사용하며 이 아바타 생성 경로와는 무관하다.

### 5.6 수정 제안 승인 플로우 — proposal_reason + 알림 발송 (NEW v1.6)

```typescript
// POST /api/approval — 수정 제안 생성
canEditDirectly = (user.id === story.creator_id || user.id === parentId)

insert approvals {
  story_id, page_id, requester_id, track,
  status: canEditDirectly ? 'approved' : 'pending',
  diff_before, diff_after,
  proposal_reason: reason ?? null,   // ← NEW v1.6
  ...(canEditDirectly && { resolved_at: now })
}

if (canEditDirectly) {
  applyDiffToPage(page_id, diff_after)  // 즉시 반영
} else {
  notifyUser({ user_id: parentId, type: 'approval_request', ... })   // 보호자에게
  notifyUser({ user_id: requester.id, type: 'approval_sent', ... })  // 제안자 본인에게
}

// PATCH /api/approval — 보호자 승인/거절 (parent role만)
update approvals { status, resolved_at, feedback? }
if (status === 'approved' && page_id) applyDiffToPage(page_id, diff_after)
notifyUser({ user_id: requester_id, type: 'approval_result', ... })
```

```typescript
// 알림 본문 생성 — 변경된 필드를 사람이 읽을 수 있는 한 줄 요약으로 변환
const FIELD_LABELS = { descriptive: '설명문', perspective: '조망문', coaching: '지시문' }
function truncate(text, max = 40) { return text.length > max ? text.slice(0, max) + '...' : text }
function summarizeDiff(diff) {
  return Object.entries(diff)
    .filter(([key]) => key in FIELD_LABELS)
    .map(([key, value]) => `[${FIELD_LABELS[key]}] ${truncate(String(value))}`)
    .join(' / ')
}
// 예: "[설명문] 줄 맨 뒤에 서서 내 차례를 조용히 기다려요."

// notifyUser — RLS 우회 (수신자가 호출자 본인이 아닐 수 있으므로 service role 사용)
async function notifyUser(payload: { user_id, type, title, body, story_id? }) {
  const serviceClient = await createServiceClient()
  await serviceClient.from('notifications').insert(payload)
}
```

> **주의:** `notifyUser()` 호출은 try/catch로 감싸여 있지 않다. `notifications` insert가 실패하면 승인/제안 처리(`approvals` insert/update와 `applyDiffToPage`)가 이미 성공했더라도 API 응답이 500으로 끝난다 — §15.3 기술 부채 참고.

---

## 6. 데이터베이스 설계

### 6.1 ERD (Entity Relationship)

```
auth.users (Supabase 관리)
    │ 1:1
    ▼
user_profiles ──────── group_members ──────── groups
    │ 1:N                                         │ 1:1
    ▼                                             ▼
children ──── avatars                          children
    │ 1:N
    ▼
stories ──── story_pages
    │ 1:N
    ├──── approvals
    └──── comments
           │
         story_pool (템플릿, 별도)

behavior_observations  ← NEW v1.3
    │ N:1 → children
    │ N:1 → user_profiles (therapist)
    └─── N:1 → stories (nullable, observation_id FK)

notifications  ← NEW v1.6
    │ N:1 → user_profiles (user_id, 수신자)
    └─── N:1 → stories (nullable, story_id FK)
```

### 6.2 핵심 테이블 설계 결정

| 결정 | 이유 |
|---|---|
| `stories.presentation_mode` 디폴트 `cumulative` | 연구 결과 최고 EF 조합 (강현정 2026) |
| `stories.chunking_type` 디폴트 `mixed` | EF M=74.68, 6조건 중 최고 |
| `stories.track` — A/B/C | 역할별 생성 맥락 추적 및 알림 분기 |
| `story_pages.cumulative_strip_text` | 누적 제시 절차 스트립 텍스트 별도 저장 |
| `avatars` 최대 5개 트리거 | Storage 용량 관리, 인지 과부하 방지 |
| `groups` 아동 1명당 1개 | 협업 단위 명확화 |
| `behavior_observations.seat_function TEXT[]` | SEAT 복수 선택 허용, 순서 무관 |
| `approvals.proposal_reason TEXT` (nullable) — NEW v1.6 | 전문가가 수정 제안 시 사유를 함께 기록, 보호자 검토에 참고 |
| `notifications` 별도 테이블 (NEW v1.6) | `type`/`title`/`body`/`story_id`/`is_read` — 승인 요청·발신 확인·승인 결과·댓글 알림을 역할 구분 없이 단일 테이블로 관리, 수신자(`user_id`)별 RLS로 격리 |

### 6.3 마이그레이션 이력

| 파일 | 내용 | 상태 |
|---|---|---|
| `001_initial_schema.sql` | 전체 테이블 + RLS + 인덱스 | ✅ 실행 완료 |
| `002_seed_story_pool.sql` | 18개 템플릿 시드 데이터 | ✅ 실행 완료 |
| `003_v2_schema_update.sql` | Track·청킹·누적제시 컬럼 추가 | ✅ 실행 완료 |
| `004_age_group_5segments.sql` | children/story_pool 연령대 5구간 변경 | ✅ 실행 완료 |
| `005_stories_delete_policy.sql` | stories DELETE RLS 정책 추가 (보호자 삭제 권한) | ✅ 실행 완료 (2026-06-07) |
| `006_behavior_observations.sql` | behavior_observations 테이블 + RLS; stories.observation_id FK | ✅ 실행 완료 (2026-06-08) |
| `007~014` | 그룹/RLS 무한 재귀 해결, creator 삭제 권한, child 역할 추가 등 — 상세는 LLD §1.6 참고 | ✅ 실행 완료 |
| `015_notifications.sql` — NEW v1.6 | notifications 테이블 + RLS (`type`/`title`/`body`/`story_id`/`is_read`) | ✅ 실행 완료 (2026-06-11) |
| `016_user_profiles_group_visibility.sql` | ⚠️ 1바이트 손상 파일("4") — 실행에는 영향 없으나 원인 불명, 후속 조사 필요 (LLD §1.6) | ⚠️ |
| `017_approval_proposal_reason.sql` — NEW v1.6 | `approvals.proposal_reason TEXT` 추가 | ✅ 실행 완료 (2026-06-11) |
| `018_realtime_publication.sql` — NEW v1.6 | `approvals`/`comments`/`notifications`를 `supabase_realtime` publication에 추가 | ✅ 실행 완료 (2026-06-11) |
| `019_notification_approval_sent.sql` — NEW v1.6 | `notifications.type` CHECK에 `'approval_sent'` 추가 | ✅ 실행 완료 (2026-06-11) |

### 6.4 인덱스 전략

```sql
-- 자주 사용되는 쿼리 기준 인덱스
idx_children_parent_id       -- 보호자 → 아동 목록
idx_stories_child_id         -- 아동 → 스토리 목록
idx_story_pages_story_id     -- 스토리 → 페이지 목록
idx_approvals_status         -- 승인 대기 목록 필터
idx_group_members_user_id    -- 사용자 → 참여 그룹
idx_stories_track            -- Track별 스토리 필터
idx_stories_chunking         -- 청킹 전략별 분석
```

---

## 7. AI 파이프라인 설계

### 7.1 소셜 스토리 생성 파이프라인

```
[입력] 자유 줄글 + 아동 프로필 + Track + 청킹 설정
    │
    ▼ STAGE 1
GPT-4o (6WH 추출)
  System: "6WH 요소를 JSON으로 추출하세요"
  Output: { who, when, where, what, how, why, missing[] }
    │
    ├── missing.length > 2 → clarify 이벤트 발송
    │
    ▼ STAGE 2
GPT-4o (소셜스토리 생성)
  System: buildTrackSystemPrompt(track, chunking_type, presentation_mode)
  Streaming: 페이지별 JSON 청크
  Output: [ { page_number, descriptive, perspective, coaching,
              chunking_label, cumulative_strip_text, image_prompt } ]
    │
    ▼ STAGE 3 (순차 — for...await, 병렬 아님 ★ v1.4 정정)
이미지 생성 (페이지별)
  → Replicate FLUX (아바타 있으면 flux-kontext-pro, 없으면 flux-schnell) → Supabase Storage (§5.4)
    │
    ▼ STAGE 4
stories + story_pages DB 저장
    │
    ▼ STAGE 5
Track별 Realtime 알림 발송
```

### 7.2 프롬프트 파라미터 매핑

```
chunking_type:
  temporal  → "먼저 → 그 다음 → 마지막으로" 시간 표지어
  spatial   → "[장소]에서" 공간 표지어
  mixed     → "[장소]에서, [시간표지어]" 혼합 (디폴트, EF 최고)

presentation_mode:
  cumulative → cumulative_strip_text 필드 생성 포함 (디폴트)
  sequential → cumulative_strip_text = null

track:
  A → 치료 목표 태그 + 지시문 강화
  B → 보호자 친화적 언어 + 일상 맥락
  C → 학교 맥락 태그 + 가정 연계 메모
```

### 7.3 Carol Gray 10.4 프롬프트 준수 규칙

```
설명문(Descriptive) + 조망문(Perspective) : 지시문(Coaching) = 최소 4:1
긍정·칭찬 문장: 전체의 최소 50%
어조: 따뜻하고 인내심 있는 1인칭/3인칭 (부정적 표현 금지)
최대 10페이지: 도입(1) + 본문(최대 8) + 결론(1)
```

### 7.4 PhotoMaker 연동 상세 — ⚠️ 미구현 (계획 단계 문서, 실제 코드 없음)

> **주의 (2026-06-08, v1.4):** 아래 설계는 §5.5 검토 결과 실제 코드(`generateAvatarImage`, `lib/openai/avatar.ts`)에 구현되어 있지 않음이 확인되었다. 현재 아바타 생성은 DALL·E 2 → Dicebear 2단계 폴백뿐이며, `tencentarc/photomaker-style` 호출 코드는 존재하지 않는다. 사진 기반 개인화 아바타가 필요하면 아래 설계를 출발점으로 별도 구현해야 한다 — 문서·코드 동기화를 위해 섹션은 남겨두되 "미구현"으로 표시한다.

```
모델: tencentarc/photomaker-style
버전: 467d062309da518648ba89d226490e02b8ed09b5abc15026e54e31c5a8cd0769

입력 파라미터:
  prompt: "img, {style_prompt}, {child_name}"
  input_image: {photo_url}  ← Supabase Storage temp URL
  style_name: Anime | (No style) | Disney Charactor | Watercolor
  num_inference_steps: 20
  guidance_scale: 5
  style_strength_ratio: 35  ← 스타일 강도 (낮을수록 얼굴 유사도 높음)

소요 시간: 30~60초
비용: 이미지당 약 $0.05
```

### 7.5 SEAT 기능 분석 프롬프트 로직 — NEW v1.3

```typescript
// lib/prompts/seat-analysis.ts
export const SEAT_SYSTEM_PROMPT = `다음 ABC 행동 관찰을 SEAT 기능 분석 틀에 따라 분류하세요.
• S (Sensory):  감각 자기자극 — 특정 감각 입력에 반애 또는 취하려는 행동
• E (Escape):   도피·회피 — 어려운 과제나 상황에서 벗어나려는 행동
• A (Attention): 관심 요청 — 특정인의 주의를 얻으려는 행동
• T (Tangible):  유형적 요구 — 특정 물건이나 활동을 얻으려는 행동
복수 기능이 동시에 적용될 수 있습니다.
JSON 형식으로만 응답: { "seat_function": ["S"|"E"|"A"|"T"], "confidence": 0.0~1.0, "rationale": "한국어 근거 1줄" }`

// Track A 프롬프트에 ABC 콘텍스트 주입
// buildTrackSystemPrompt에서 abc_observation 쭘재시 추가 프롬프트:
if (input.abc_observation) {
  trackAInstructions += `
[ABC 행동 관찰 콘텍스트 — 이 데이터를 반드시 반영하세요]
• 도전 상황(A): ${input.abc_observation.antecedent}
• 발생 행동(B): ${input.abc_observation.behavior}
• 현재 결과(C): ${input.abc_observation.consequence}
• 대체행동 목표: ${input.abc_observation.replacement_behavior}
지시문(Coaching)에서 대체행동 목표를 명확하게 제시하세요.
조망문(Perspective)에서 대체행동을 한 후 예상되는 꺍정적 결과를 묘사하세요.`
}
```

---

## 8. 인증 및 보안 설계

### 8.1 인증 흐름

```
회원가입:
  POST /api/auth/signup
  → supabase.auth.admin.createUser (Service Role)
  → email_confirm: true (이메일 확인 없이 즉시 활성화)
  → user_profiles upsert

로그인:
  supabase.auth.signInWithPassword (클라이언트)
  → JWT 토큰 → 쿠키 저장

세션 갱신:
  proxy.ts에서 매 요청마다 supabase.auth.getUser() 호출
  → 만료된 토큰 자동 갱신
```

### 8.2 역할 기반 접근 제어 (RBAC)

```
API 레이어 검증:
  track=A 생성 → therapist만 허용
  track=B 생성 → parent만 허용
  track=C 생성 → teacher만 허용
  아바타 생성·삭제 → parent만 허용
  승인 처리 → parent만 허용
  청킹 전략 수정 → therapist만 허용
  그룹 참여(초대 코드) → therapist/teacher/child 허용, parent는 403 차단

RLS 레이어 검증 (DB 레벨):
  children → parent_id = auth.uid() OR group member
  stories → child 소유자 OR group member
  avatars → parent 소유자
  approvals → 요청자 OR 보호자
  comments → group member 전체
  user_profiles.role → CHECK ('parent','therapist','teacher','child') — migration 014
  group_members.role → CHECK ('parent','therapist','teacher','child') — migration 014

미들웨어 레이어 검증 (경로 보호):
  child 역할 → /bookshelf, /settings, /story/* (읽기) 허용
  child 역할 → /story/create 포함 나머지 경로 → /bookshelf로 리다이렉트
  child 로그인 → /dashboard 대신 /bookshelf로 자동 이동
```

### 8.3 보안 고려사항

| 위협 | 대응책 |
|---|---|
| API 키 노출 | 서버 사이드 전용 (.env.local, Git 제외) |
| 무단 데이터 접근 | RLS 전면 적용 |
| 이미지 업로드 악용 | 파일 타입 검증 (JPEG/PNG only), 5MB 제한 |
| 아동 사진 유출 | Storage 비공개 버킷, Service Role만 접근 |
| CSRF | Next.js 내장 CSRF 보호 |
| Email Rate Limit | Admin API 사용으로 우회 |

---

## 9. 실시간 통신 설계

### 9.1 group:{group_id} 채널 (collab.store.ts)

```typescript
// 채널명: group:{group_id}
// 구독 이벤트 (모두 INSERT만 — UPDATE/DELETE는 미구독):

'postgres_changes' → approvals INSERT
  → collab.store.ts의 approvals(승인 대기) 배열 앞에 추가

'postgres_changes' → comments INSERT
  → 그룹 멤버 전체에 댓글 실시간 추가
```

> **주의:** `approvals`/`comments`는 INSERT만 구독한다. `PATCH /api/approval`로 `status`가 변경(승인/거절)되어도 Realtime UPDATE 이벤트는 오지 않으므로, `collab.store.ts`의 `resolveApproval()`은 PATCH 응답을 받은 클라이언트 본인이 로컬 상태에서 `approvals` → `approvalHistory`로 직접 옮기는 방식으로 '승인 내역' 탭을 갱신한다 — 같은 그룹의 다른 사용자 화면은 새로고침 전까지 갱신되지 않는다.

### 9.2 notifications:{user_id} 채널 (notification.store.ts) — NEW v1.6

```typescript
// 채널명: notifications:{user_id}
supabase.channel(`notifications:${userId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => { /* notifications 배열 맨 앞에 추가, unreadCount += 1 */ }
  )
  .subscribe()
```

- `connect(userId)`/`disconnect()` — `MainLayout`에서 로그인 사용자 기준으로 1회 연결
- `notifyUser()`(§5.6)가 service role로 `notifications`에 INSERT하면, 수신자 브라우저의 이 채널이 즉시 이벤트를 받아 알림 배지(`unreadCount`)와 `/notifications` 목록을 실시간 갱신
- HLD §6.2에서 설계됐던 "스토리 생성 시 Track별(`story:created:trackA/B/C`) Realtime 알림 분기"는 여전히 미구현이며, 실제 구현된 것은 **승인 제안/처리에 대한 알림**(이 절)뿐이다 (Plan §5-9 참고)

### 9.3 supabase_realtime publication 등록 — 필수 전제조건 (migration 018, NEW v1.6)

> **버그 이력 (2026-06-11):** Supabase Realtime의 `postgres_changes`는 채널이 `SUBSCRIBED` 상태가 되어도, 대상 테이블이 `supabase_realtime` publication에 등록되어 있지 않으면 이벤트를 전혀 받지 못한다 — 에러 없이 조용히 무시된다. `approvals`/`comments`/`notifications` 3개 테이블이 모두 누락되어 있었고, `018_realtime_publication.sql`로 등록한 뒤 정상 동작이 확인되었다.

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

> 새 테이블에 Realtime 구독을 추가할 때마다 이 publication 등록을 빠뜨리지 않아야 한다 — RLS 정책 누락으로 인한 "성공했다는데 반영 안 됨"(UPDATE/DELETE silent failure)과 같은 계열의 "조용한 실패" 패턴이다.

### 9.4 연결 관리

```typescript
// collab.store.ts
connectToGroup(groupId) → RealtimeChannel 생성 + 구독
disconnectFromGroup()   → 채널 제거 (페이지 이탈 시)

// notification.store.ts — NEW v1.6
connect(userId) → RealtimeChannel 생성 + 구독
disconnect()    → 채널 제거

// 재연결 처리: Supabase 자동 재연결 (기본 설정)
// 연결 상태 표시: isConnected boolean 상태
```

---

## 10. 파일 스토리지 설계

### 10.1 Supabase Storage 버킷 구조

```
avatars/           (비공개)
  temp/{child_id}/   ← 업로드된 원본 사진 (임시)
  {child_id}/        ← 생성된 아바타 이미지
    {style}_{timestamp}.png

story-images/      (공개)
  {story_id}/
    page_{n}_{timestamp}.png

tts-cache/         (공개)
  {hash}.mp3         ← 텍스트 해시 기반 캐싱
```

### 10.2 접근 권한

| 버킷 | Public | 업로드 | 읽기 |
|---|---|---|---|
| `avatars` | OFF | Service Role만 | Service Role만 |
| `story-images` | ON | Service Role만 | 모든 사용자 |
| `tts-cache` | ON | Service Role만 | 모든 사용자 |

### 10.3 TTS 캐싱 전략

```
요청 → computeCacheKey(text, voice) → 해시
→ Storage에서 {hash}.mp3 조회
  → 있으면: 즉시 URL 반환 (캐시 히트)
  → 없으면: Google TTS 호출 → MP3 저장 → URL 반환
```

> **버그 이력 (2026-06-08, v1.4 — 정상화 완료):** §10.2 설계상 `tts-cache` 업로드는 "Service Role만" 가능하도록 명시돼 있었으나, 실제 `/api/tts` 코드는 일반 사용자 클라이언트(`createClient()`)로 업로드를 시도했다. `storage.objects`에 일반 사용자용 INSERT RLS 정책이 없어 업로드가 **에러를 던지지 않고 조용히 실패**했고(반환된 `error`를 무시), 이후 "성공" 응답에 실제로는 존재하지 않는 파일의 공개 URL이 담겨 브라우저에서 `NotSupportedError: Failed to load because no supported source was found`가 발생했다. `createServiceClient()`(service-role)로 전환하고 `uploadError`를 명시적으로 throw하도록 수정해 설계 스펙과 코드를 일치시켰다(`saveImageBuffer`/`story-images`와 동일 패턴, LLD §2.6 상세).
>
> 이와 별개로 두 가지 버그가 더 있었다 — ① `GOOGLE_TTS_API_KEY`가 placeholder 값으로 방치되어 모든 합성 요청 실패(사용자가 실제 키 발급 후 해결), ② 요청 바디에 Google TTS REST `v1`이 지원하지 않는 `enableTimePointing` 필드가 포함돼 모든 요청이 `400 Unknown name "enableTimePointing"`로 실패(필드 제거로 해결). 세 버그 모두 수정 완료했으며, 단어 하이라이트(§15.1 `word_timings` 활용)는 여전히 미구현 상태다.

---

## 11. 성능 및 최적화

### 11.1 이미지 최적화

```typescript
// next/image 사용
<Image
  src={avatar.image_url}
  width={144}
  height={144}
  className="object-cover"
/>
// → 자동 WebP 변환, lazy loading, blur placeholder
```

### 11.2 SSE 스트리밍 최적화

```
스토리 생성 체감 속도 향상:
- 페이지 1개 완성될 때마다 즉시 UI에 표시 (page 이벤트)
- 이미지 생성은 페이지별 순차 처리 (for...await — ★ v1.4 정정: "병렬(Promise.all)"로 잘못 기술돼 있었으나 실제 코드는 순차. FLUX Schnell 자체가 장당 ~0.6초로 빨라 순차로도 체감 지연이 크지 않음)
- TTS는 뷰어 최초 로드 시점에 lazy 합성
```

### 11.3 Supabase 쿼리 최적화

```typescript
// 불필요한 컬럼 제외
.select('id, title, page_count, updated_at')  // * 사용 금지

// 관련 데이터 단일 쿼리로 조회 (N+1 방지)
.select('*, children(name, age_group), story_pages(*)')

// 페이지네이션
.range(offset, offset + limit - 1)
```

### 11.4 목표 성능 지표

| 지표 | 목표 |
|---|---|
| 첫 스토리 완성 시간 | 10분 이내 |
| 아동 아바타 생성 (DALL·E 2) | 20초 이내 |
| 페이지 일러스트 생성 (FLUX, 1장) | ★ v1.4: 약 0.6초 (flux-schnell 기준, 페이지 수만큼 순차 누적) |
| 페이지 초기 로딩 | 2초 이내 |
| TTS 캐시 히트 응답 | 200ms 이내 |

---

## 12. 배포 아키텍처

### 12.1 Vercel 배포 구성

```
GitHub main 브랜치 push
    │
    ▼
Vercel CI/CD
  ├── npm run build (Next.js 16 Turbopack)
  ├── TypeScript 타입 체크
  └── 빌드 성공 시 자동 배포

환경:
  Production: main 브랜치 → 커스텀 도메인
  Preview:    PR 브랜치 → 자동 preview URL
```

### 12.2 Edge vs Node.js Runtime

```typescript
// AI API는 긴 응답 시간 → Node.js Runtime
export const runtime = 'nodejs'
export const maxDuration = 120  // 2분

// 일반 API는 Edge Runtime (빠른 응답)
// proxy.ts는 자동으로 Edge에서 실행
```

### 12.3 환경별 설정

| 환경 | Supabase | OpenAI | Replicate |
|---|---|---|---|
| Local Dev | 개발 프로젝트 | 실제 키 | 실제 키 |
| Production | 프로덕션 프로젝트 | 실제 키 | 실제 키 |

---

## 13. 에러 처리 전략

### 13.1 AI 서비스 Fallback 체인

```
[아동 아바타 생성] (§5.5 — 실제 코드 기준, ★ v1.4 정정: PhotoMaker 단계 없음)
DALL·E 2 실패
    → Dicebear 캐릭터 (이름 seed 기반, 항상 성공)

[페이지 일러스트 생성] (§5.4 — Replicate FLUX)
flux-kontext-pro / flux-schnell 실패
    → 페이지별 try/catch로 흡수, image_url = null로 저장 후 다음 페이지 계속 진행
       (대체 이미지 폴백은 없음 — 해당 페이지만 일러스트 없이 표시됨)

GPT-4o 스토리 생성 실패
    → 사용자에게 명확한 에러 메시지 + 재시도 버튼

Google TTS 실패
    → TTS 없이 텍스트만 표시 (앱 기능 유지)
```

### 13.2 에러 메시지 한국어화

```typescript
// 모든 영어 에러를 한국어로 변환
const ERROR_MAP: Record<string, string> = {
  'already registered':   '이미 가입된 이메일이에요. 로그인해 주세요.',
  'invalid email':        '이메일 형식이 올바르지 않아요.',
  'password':             '비밀번호는 8자 이상이어야 해요.',
  'rate limit':           '잠시 후 다시 시도해 주세요.',
}
```

### 13.3 클라이언트 에러 표시

```
전역 에러: react-hot-toast (토스트 알림)
폼 에러: 인라인 빨간 텍스트
API 에러: 카드 내 에러 메시지 + 재시도 버튼
404: Next.js 기본 not-found 페이지
```

---

## 14. 환경 변수 명세

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://{project}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}
SUPABASE_SERVICE_ROLE_KEY={service_role_key}  # 서버 전용

# OpenAI (스토리 생성·제목·SEAT 분석 필수, 아동 아바타 생성(DALL·E 2)에도 사용 — 페이지 일러스트에는 더 이상 사용 안 함)
OPENAI_API_KEY=sk-proj-{key}

# Replicate (★ v1.4: 페이지 일러스트 생성 필수 — flux-schnell/flux-kontext-pro. 2026.06 Pollinations.ai → 전환)
REPLICATE_API_KEY=r8_{key}

# Google Cloud TTS (음성 읽기, 선택 — placeholder 키로는 모든 요청이 실패하므로 실제 키 발급 필요)
GOOGLE_TTS_API_KEY={key}

# 앱
NEXT_PUBLIC_APP_URL=http://localhost:3000  # 배포 시 실제 도메인
```

### 14.1 기능별 필수 키

| 기능 | 필수 환경변수 |
|---|---|
| 로그인·회원가입 | SUPABASE_* |
| 스토리 AI 생성·제목·SEAT 분석 | OPENAI_API_KEY |
| 아동 아바타 생성(DALL·E 2) | OPENAI_API_KEY (실패 시 Dicebear 폴백) |
| 페이지 일러스트 생성(Replicate FLUX) | REPLICATE_API_KEY ★ v1.4: 필수 — 키 없으면 모든 페이지 이미지 생성 실패(이미지 없는 페이지로 저장) |
| 음성 읽기(TTS) | GOOGLE_TTS_API_KEY (placeholder 키로는 동작 안 함, 실제 키 필요) |
| Dicebear 더미 아바타 | 없음 (항상 동작) |

---

## 15. 기술적 제약 및 한계

### 15.1 현재 MVP 기술 제약

| 제약 | 내용 | v4+ 개선 방향 |
|---|---|---|
| 오프라인 미지원 | 웹 전용, PWA 미구현 | Service Worker + IndexedDB |
| TTS 단어 하이라이트 | `synthesizeKorean`이 `WordTiming[]`을 응답에 포함하지만 일반 텍스트 요청이라 `timepoints`가 항상 `[]`이고, 프론트(`StoryViewer.playTTS`)도 이를 사용하지 않음 (★ v1.4: 다음 우선순위 작업) | SSML `<mark>` 삽입 + `v1beta1` 전환 + 프론트 하이라이트 렌더링 |
| 실시간 공동 편집 | 동시 편집 불가 (마지막 저장 승리) | CRDT 또는 OT 알고리즘 |
| 아동 아바타 개인화 | 사진 기반 개인화(PhotoMaker) 미구현 — DALL·E 2 프롬프트 생성 + Dicebear 폴백뿐 (★ v1.4 정정, §5.5/§7.4) | PhotoMaker 등 img2img 모델 연동 |
| 페이지 일러스트 캐릭터 일관성 | 아바타 등록 아동만 `flux-kontext-pro`로 일관성 확보, 미등록 아동은 페이지마다 캐릭터가 달라질 수 있음 | 미등록 아동도 1회 생성된 페이지 이미지를 참조 이미지로 재사용 |
| 진도 추적 | 스토리 열람 횟수 미집계 | Analytics 테이블 추가 |

### 15.2 확장성 고려사항

```
현재: Supabase Free Tier
  - DB: 500MB
  - Storage: 1GB
  - Realtime: 200 동시 연결

스케일업 시:
  - Supabase Pro ($25/월): 8GB DB, 100GB Storage
  - Vercel Pro: 더 긴 serverless 실행 시간
  - OpenAI: 사용량 기반 과금 (예측 가능)
  - Replicate: 사용량 기반 과금
```

### 15.3 알려진 기술 부채

| 항목 | 상태 |
|---|---|
| `ChunkingSelector.tsx` → `ChunkingStrategyPanel.tsx`로 통합 필요 | 구형 파일 잘존 |
| `story.store.ts` v2 Track 상태 미완성 | 부분 구현 |
| `/api/story/generate` Track 파라미터 처리 | ⬜ 미구현 (다음 우선순위) |
| `/api/story/[id]/chunking` 엔드포인트 미구현 | 계획됨 |
| 단어 하이라이트 TTS 동기화 미완성 | 계획됨 |
| 모바일 스와이프 제스처 미구현 | 계획됨 |
| 스토리 뷰어 상단 TrackBadge 미표시 | ⬜ 소작업 |
| **behavior_observations 테이블 migration 006** | ⏳ 개발 예정 |
| **/api/observations 5개 엔드포인트** | ⏳ 개발 예정 |
| **ObservationForm / SeatSelector UI 컴포넌트** | ⏳ 개발 예정 |
| **/observations 페이지 (3개)** | ⏳ 개발 예정 |
| **`notifyUser()` 호출이 try/catch 없음 (NEW v1.6)** | `/api/approval`의 POST/PATCH에서 `notifications` insert 실패 시, 본 작업(승인 생성·처리·`applyDiffToPage`)이 이미 성공했어도 응답이 500으로 끝남 (§5.6) |
| **SideBar `pendingCount` prop 죽은 코드 (NEW v1.6)** | `MainLayout`이 값을 계산·전달하지 않아 "승인 대기 N건" 박스가 항상 0 — 후속 정리 필요 (LLD §3.22) |
| **migration 016 손상 파일 (NEW v1.6)** | `016_user_profiles_group_visibility.sql`이 1바이트("4")로 손상되어 있으나 cross-user RLS는 정상 동작 — 원인 불명 (LLD §1.6) |

> **해결된 기술 부채 (v1.1)**
> - ~~SideBar 역할 배지 표시 안 됨~~ → MainLayout server component prop 방식으로 완전 해결
>
> **해결된 기술 부채 (2026-06-07)**
> - ~~`migration 004` Supabase 미실행~~ → 실행 완료 (5구간 AgeGroup 반영)
> - ~~스토리 삭제 버튼을 눌러도 실제로 삭제되지 않음~~ → 원인은 `stories` 테이블에 RLS DELETE 정책이 없어 0행 삭제로 조용히 처리되던 것. `005_stories_delete_policy.sql`로 "보호자 스토리 삭제" DELETE 정책 추가, Supabase 대시보드 SQL Editor에서 실행 완료

---

## 부록

### A. 주요 파일 위치

```
D:\2. 연세대학원\workspace_app\storybridge\
├── docs/                    ← 설계 문서 (PRD, HLD, LLD, Plan, DesignSpec, TDD)
├── src/
│   ├── app/                 ← Next.js App Router 페이지·API
│   ├── components/          ← 재사용 UI 컴포넌트
│   ├── lib/                 ← 외부 서비스 클라이언트
│   │   ├── supabase/        ← Supabase 클라이언트 (client/server/middleware)
│   │   ├── openai/          ← GPT-4o·DALL-E 클라이언트
│   │   ├── replicate/       ← PhotoMaker 클라이언트
│   │   ├── tts/             ← Google TTS 클라이언트
│   │   └── prompts/         ← AI 프롬프트 템플릿
│   ├── stores/              ← Zustand 상태관리
│   └── types/               ← TypeScript 타입 정의
├── supabase/migrations/     ← DB 마이그레이션 SQL
└── .env.local               ← 환경 변수 (Git 제외)
```

### B. 참고 문서

- PRD v3.6: `StoryBridge_PRD_v3_0.md`
- HLD v2.6: `StoryBridge_HLD_v2.0.md`
- LLD v2.7: `StoryBridge_LLD_v2.0.md`
- Plan v2.7: `StoryBridge_Plan_v2.0.md`
- DesignSpec v2.6: `StoryBridge_DesignSpec_v2.0.md`
- WORKFLOW: `WORKFLOW.md`

---

## v1.0 → v1.1 변경 요약 (2026.06.06)

| 섹션 | 변경 내용 |
|---|---|
| §4.1 라우팅 | /profile 페이지 추가 |
| §6.3 마이그레이션 | migration 004 추가 (미실행) |
| §15.3 기술 부채 | SideBar 역할 배지 해결됨; migration 004 및 API v2 Track 처리 추가 |
| 부록 B | 문서 버전 업데이트 |

## v1.1 → v1.2 변경 요약 (2026.06.07)

| 섹션 | 변경 내용 |
|---|---|
| §6.3 마이그레이션 | migration 004 실행 완료로 상태 정정; `005_stories_delete_policy.sql`(stories DELETE RLS 정책) 추가 및 실행 완료 반영 |
| §15.3 기술 부채 | "migration 004 미실행" 항목을 해결됨으로 이동; "스토리 삭제 버튼 미작동(RLS DELETE 정책 누락)" 신규 발견·해결 항목 추가 |

---

## v1.2 → v1.3 변경 요약 (2026.06.08)

| 섹션 | 변경 내용 |
|---|---|
| §5.5 API | 행동 관찰 API 기술 명세 신규 (POST, GET, SEAT 분석, story-input 변환, 링크) |
| §6.1 ERD | behavior_observations 노드 추가 (children + user_profiles + stories 연결) |
| §6.2 테이블 설계 | behavior_observations.seat_function TEXT[] 항목 추가 |
| §6.3 마이그레이션 | migration 006_behavior_observations.sql 항목 추가 |
| §7.5 AI 파이프라인 | SEAT 기능 분석 프롬프트 로직 신규; Track A 프롬프트에 ABC 콘텍스트 주입 로직 추가 |
| §15.3 기술 부채 | 행동 관찰 기능 미구현 항목 신규 추가 |

---

## v1.3 → v1.4 변경 요약 (2026.06.08)

> 이번 개정은 코드와 문서 간 불일치를 다수 정정하는 데 초점을 맞췄다 — 특히 §5.4/§5.5/§7.4의 이미지 생성 파이프라인은 실제로 PhotoMaker를 쓰지 않는데도 문서에는 핵심 기술로 명시돼 있던 차이를 바로잡았다.

| 섹션 | 변경 내용 |
|---|---|
| §1.2, 1.3, 2.1, 3.2 | "Replicate PhotoMaker(사진 기반 아바타)" → "Replicate FLUX Schnell/Kontext Pro(페이지 일러스트)" + "OpenAI DALL·E 2(아동 아바타)"로 정정 — 실제 코드의 두 파이프라인을 분리 기술 |
| §5.3, §7.1, §11.2 | "이미지 생성 (병렬, Promise.all)" → "페이지별 순차 처리(for...await)"로 정정 (실제 코드와 불일치하던 부분, HLD v2.4·LLD v2.5와 동기화) |
| §5.4 전면 재작성 | 페이지 일러스트 생성 — Replicate FLUX 분기 로직(아바타 있으면 flux-kontext-pro로 캐릭터 일관성, 없으면 flux-schnell 폴백) 신규 기술. 2026.06 Pollinations.ai → Replicate 전환 배경(x402 결제 프로토콜 도입으로 서비스 중단) 명시 |
| §5.5 신규 | 아동 아바타 이미지 생성 — 실제 코드(`generateAvatarImage`) 기준 DALL·E 2 → Dicebear 2단계 폴백 구조로 신규 작성 (기존 §5.4 "PhotoMaker 1순위" 설계가 실제로는 구현되지 않았음을 확인) |
| §7.4 | "PhotoMaker 연동 상세"를 "⚠️ 미구현 (계획 단계 문서, 실제 코드 없음)"으로 표시 — 섹션은 향후 구현 출발점으로 보존 |
| §10.3 | TTS 캐싱 — `tts-cache` storage RLS 누락으로 인한 silent upload 실패, `enableTimePointing` 필드 오류, placeholder API 키 등 버그 3건의 발견·수정 이력 추가 (정상화 완료) |
| §13.1 | AI 서비스 Fallback 체인 — PhotoMaker 단계 제거, 아바타(DALL·E 2→Dicebear)와 페이지 일러스트(FLUX, 페이지별 try/catch로 흡수·폴백 없음) 경로를 분리 기술 |
| §14, §14.1 | 환경 변수 설명 갱신 — `REPLICATE_API_KEY`를 "선택"에서 "페이지 일러스트 생성 필수"로 변경, `OPENAI_API_KEY`/`GOOGLE_TTS_API_KEY` 용도·주의사항 보강 |
| §11.4 | 성능 지표 — "아바타 생성(PhotoMaker) 60초"를 "DALL·E 2 아바타 20초" + "FLUX 일러스트 1장 약 0.6초(순차 누적)"로 분리 갱신 |
| §15.1 | 기술적 제약 — "아바타 유사도(PhotoMaker)" 항목을 "아동 아바타 개인화 미구현" + "페이지 일러스트 캐릭터 일관성(미등록 아동 한계)"으로 재작성; TTS 단어 하이라이트 항목에 미구현 상세(word_timings 미사용 경로) 보강 |

---

---

## v1.4 → v1.5 변경 요약 (2026.06.09)

| 섹션 | 변경 내용 |
|---|---|
| §8.2 RBAC | child 역할 추가 — 그룹 참여 허용 조건, DB CHECK 제약 업데이트(migration 014), 미들웨어 경로 보호 로직 명시 |
| §4.1 라우팅 | child 역할 접근 가능 경로(`/bookshelf`, `/settings`, `/story/[id]`)와 차단 경로(`/story/create`, `/dashboard` 등) 명시 |

---

## v1.5 → v1.6 변경 요약 (2026.06.11)

| 섹션 | 변경 내용 |
|---|---|
| §4.3 상태 관리 | `notification.store.ts` 신규 추가 (notifications:{userId} 채널, unreadCount, markAsRead/markAllAsRead) |
| §4.5 (신규) | DiffViewer — LCS(최장 공통 부분열) 기반 토큰(단어) 단위 diff 알고리즘(tokenize/diffTokens) 신규 명세 |
| §5.6 (신규) | 수정 제안 승인 플로우 — `proposal_reason`, `notifyUser`/`summarizeDiff`/`FIELD_LABELS`, POST/PATCH `/api/approval` 처리 흐름; `notifyUser` try/catch 미적용 주의사항 명시 |
| §6.1 ERD | `notifications` 노드 추가 (user_profiles N:1, stories nullable FK) |
| §6.2 테이블 설계 | `approvals.proposal_reason TEXT`, `notifications` 테이블 설계 결정 추가 |
| §6.3 마이그레이션 | `006` 상태를 "개발 예정"→"실행 완료"로 정정, `007~014` 요약 행 추가, `015/017/018/019`(NEW v1.6) 및 `016`(손상 파일 ⚠️) 추가 |
| §9 실시간 통신 | 전면 재구성 — §9.1 group:{groupId}(INSERT-only 한계 명시), §9.2 notifications:{userId} 채널 신규, §9.3 supabase_realtime publication 등록 필수 전제조건(migration 018) 신규, §9.4 연결 관리에 notification.store.ts 추가; 미구현 "Track별 생성 알림 분기"와의 차이 명시 |
| §15.3 기술 부채 | `notifyUser` try/catch 미적용, SideBar `pendingCount` 죽은 코드, migration 016 손상 파일 3건 추가 |
| 부록 B | 참고 문서 버전 표기를 헤더 참조(PRD v3.6/HLD v2.6/LLD v2.7/Plan v2.7/DesignSpec v2.6)와 동기화 |

---

*StoryBridge TDD v1.6 | 2026.06.11*  
*연세대학교 심리과학이노베이션대학원 디지털혁신 트랙 — 강현정*
