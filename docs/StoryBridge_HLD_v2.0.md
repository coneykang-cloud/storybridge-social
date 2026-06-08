# StoryBridge HLD (High-Level Design) v2.0

**버전:** v2.4  
**작성일:** 2026.06.05 / 최종 업데이트: 2026.06.08  
**작성자:** 강현정  
**참조:** StoryBridge_PRD_v3_4.md  
**변경 이력:** v1.0 → v2.0 (3-Track 모델, 청킹 2차원화, 누적 제시 UI 반영) / v2.0 → v2.1 (사이드바 역할 배지 구현, ChildSelectorPanel 추가, /profile 라우트, 연령대 5구간) / v2.1 → v2.2 (행동 관찰하기 Observation 모듈 추가, ABC→Track A 데이터 플로우, SEAT AI 파이프라인 추가) / v2.2 → v2.3 (브릿지 책장 라우트, AI 제목 자동 생성·인라인 수정, creator 기반 수정·삭제 권한 + RLS 정책 동기화, ABC→Track A 매핑을 raw_input 실제 순서로 수정) / v2.3 → v2.4 (이미지 생성 Pollinations/DALL·E 3 → Replicate FLUX 전환 및 아바타 기반 캐릭터 일관성 도입, Google TTS 버그 수정 — enableTimePointing 필드 제거 및 service-role 캐싱)

---

## 목차

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [컴포넌트 구조](#2-컴포넌트-구조)
3. [데이터 플로우](#3-데이터-플로우)
4. [외부 서비스 통합](#4-외부-서비스-통합)
5. [인증 및 권한 설계](#5-인증-및-권한-설계)
6. [실시간 통신 설계](#6-실시간-통신-설계)
7. [AI 파이프라인 설계](#7-ai-파이프라인-설계)
8. [배포 아키텍처](#8-배포-아키텍처)
9. [보안 설계](#9-보안-설계)

---

## 1. 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│                                                                  │
│   Browser / Mobile Web (Next.js 16 App Router, React 18)        │
│   ┌───────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│   │  보호자 UI     │  │  치료사 UI      │  │  교사 UI          │  │
│   │  (Track B)    │  │  (Track A)     │  │  (Track C)        │  │
│   └──────┬────────┘  └───────┬────────┘  └─────────┬─────────┘  │
└──────────┼───────────────────┼──────────────────────┼────────────┘
           │                   │                      │
           ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER LAYER                             │
│   Next.js API Routes (Node.js Runtime)                          │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│   │  Auth API   │  │  Story API   │  │   Avatar API          │   │
│   │  /api/auth  │  │ /api/story   │  │   /api/avatar         │   │
│   └──────┬──────┘  └──────┬───────┘  └────────────┬──────────┘   │
│          │                │                        │              │
│   ┌──────┴────────────────┴────────────────────────┴──────────┐  │
│   │                    Service Layer                            │  │
│   │  StoryService(3-Track) | AvatarService | CollabService     │  │
│   │  ChunkingService       | TTSService    | NotifyService      │  │
│   └──────┬────────────────┬────────────────────────┬──────────┘  │
└──────────┼────────────────┼────────────────────────┼────────────┘
           │                │                        │
┌──────────▼────────────────▼────────────────────────▼────────────┐
│                       EXTERNAL SERVICES                          │
│  ┌────────────┐ ┌──────────┐ ┌──────────────────┐ ┌───────────┐ │
│  │  Supabase  │ │  OpenAI  │ │  Replicate       │ │ Google    │ │
│  │  - Auth    │ │ - GPT-4o │ │  - flux-schnell  │ │ Cloud TTS │ │
│  │  - Postgres│ │ (텍스트  │ │  - flux-kontext  │ │ - Neural2 │ │
│  │  - Realtime│ │  생성만) │ │    -pro (이미지   │ │   한국어  │ │
│  │  - Storage │ │          │ │    조건부 편집)   │ │           │ │
│  │            │ │          │ │  - flux-2-pro 등 │ │           │ │
│  │            │ │          │ │    (아바타 스타일)│ │           │ │
│  └────────────┘ └──────────┘ └──────────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```
> **2026.06 변경:** 이미지 생성을 OpenAI(DALL·E 3)/Pollinations.ai에서 **Replicate**로 일원화.
> Pollinations.ai는 x402 결제 프로토콜 도입으로 "Queue full for IP" 402가 상시 발생해 사용 불가
> 판정 → 유료지만 저렴한 FLUX 계열(`flux-schnell` 텍스트→이미지, `flux-kontext-pro` 이미지 조건부
> 편집으로 아바타 기반 캐릭터 일관성 확보)로 전환.

---

## 2. 컴포넌트 구조

### 2.1 프론트엔드 모듈 분해

```
StoryBridge Frontend
│
├── [공개 영역]
│   ├── /signin
│   └── /signup  (역할 선택 → 계정 생성)
│
├── [인증 영역]
│   ├── /dashboard
│   │   ├── 최근 스토리 카드
│   │   ├── 연결된 그룹 알림
│   │   └── 승인 대기 배지 (보호자 전용)
│   │
│   ├── /avatar-studio          ← 보호자 전용
│   │
│   ├── /story/create           ← Track 선택 분기점
│   │   ├── Track A (/story/create/therapist)
│   │   │   ├── 치료 목표 태그 선택
│   │   │   ├── 치료사 전용 6WH 가이드
│   │   │   ├── 청킹 전략 설정 (유형 + 제시방식, 치료사 수정 가능)
│   │   │   └── AI 생성 → 인라인 편집 → 가정 활용 요청
│   │   │
│   │   ├── Track B (/story/create/parent)
│   │   │   ├── 자유 줄글 + 6WH 가이드
│   │   │   ├── 청킹 전략 설정 (열람만)
│   │   │   └── AI 생성 → 인라인 편집 → 치료사 검토 요청(선택)
│   │   │
│   │   ├── Track C (/story/create/teacher)
│   │   │   ├── 학교 맥락 태그 선택
│   │   │   ├── 가정 연계 메모 입력
│   │   │   ├── 청킹 전략 설정 (열람만)
│   │   │   └── AI 생성 → 그룹 자동 공유
│   │   │
│   │   └── Pool (/story/create/pool)
│   │       ├── 연령대 필터
│   │       └── 카테고리 필터 (A/B)
│   │
│   ├── /story/[id]
│   │   ├── 스토리 상세 (메타 + 페이지 미리보기)
│   │   ├── EditableStoryTitle  ← NEW v2.3: 제목 인라인 수정 (creator 전용, 연필 아이콘)
│   │   ├── DeleteStoryButton   ← NEW v2.3: 삭제 (자녀 소유 보호자 또는 creator)
│   │   └── /story/[id]/view    ← 뷰어 (3모드 + 누적 제시 스트립)
│   │
│   ├── 🆕 /bookshelf — NEW v2.3 "브릿지 책장 (내 이야기)"
│   │   ├── 보유·그룹 연결된 전체 스토리 모아보기 (RLS-only 조회)
│   │   ├── 트랙 필터 칩 (전체/🩺치료사/👩보호자/👩‍🏫교사)
│   │   └── BookshelfClient (카드: 표지·제목·TrackBadge·아동명·페이지수·날짜)
│   │
│   ├── /collab/[groupId]       ← Track별 협업 탭
│   │
│   └── /settings
│
└── [공통 컴포넌트]
    ├── BottomNavBar (모바일)            ← v2.3: "책장"(BookOpen) 메뉴 추가
    ├── SideBar (태블릿/데스크탑)         ← v2.3: "브릿지 책장"(BookOpen) 메뉴 추가
    ├── ChunkingStrategyPanel   ← NEW v2: 청킹 유형 + 제시방식 통합 설정
    ├── CumulativeStrip         ← NEW v2: 절차 진행 스트립 (뷰어용)
    ├── TherapyGoalTags         ← NEW v2: Track A 치료 목표 태그
    ├── SchoolContextTags       ← NEW v2: Track C 학교 맥락 태그
    ├── TrackBadge              ← NEW v2: 스토리 생성 주체 배지 (track → TRACK_META 직결)
    ├── ChildSelectorPanel      ← NEW v2.1: 아이 선택 (모바일 수평/PC 세로)
    ├── ObservationForm         ← NEW v2.2: ABC 입력 폼 (A/B/C + 대체행동 + 환경)
    ├── SeatSelector            ← NEW v2.2: SEAT 4분류 체크박스
    ├── ObservationHistory      ← NEW v2.2: 시계열 관찰 카드 목록
    ├── StoryLinkButton         ← NEW v2.2: "이 관찰로 스토리 만들기" CTA
    └── AccessibilityToggle
```

### 2.2 백엔드 서비스 분해

| 서비스 | 책임 | 주요 메서드 |
|---|---|---|
| **AuthService** | 역할 기반 인증, 세션 관리 | signUp(Admin API), signIn, getRole |
| **ChildService** | 아동 프로필 CRUD | createChild, updateChild, getChild |
| **AvatarService** | Replicate 요청(스타일별 모델 분기), 아바타 저장 | generateAvatar, listAvatars |
| **StoryService** | GPT-4o 생성(3-Track 분기) + Replicate 페이지 일러스트 생성 | createTrackA, createTrackB, createTrackC, generatePageImage |
| **ChunkingService** | NEW v2: 청킹 파라미터 관리 | applyChunkingPrompt, applyCumulativeStrip |
| **TTSService** | Google TTS 요청, Storage 캐싱(service-role 업로드) | synthesize, getCached |
| **CollabService** | 그룹·댓글·승인·Track별 알림 | inviteMember, requestApproval, notifyByTrack |
| **PoolService** | 템플릿 라이브러리 조회·커스터마이징 | getByAgeAndCategory, customizeForChild |

---

## 3. 데이터 플로우

### 3.1 Track A — 치료사 주도 생성 플로우

```
[치료사] 치료 목표 태그 선택 + 자유 입력
        │
        ▼ POST /api/story/generate { track: 'A', therapy_goal_tags, chunking_type, presentation_mode }
[StoryService.createTrackA()]
  1. 줄글 → GPT-4o (6WH 추출, 치료 목표 강조 프롬프트)
  2. Track A 프롬프트 주입: 치료 목표 태그 + 지시문 중심 배치
  3. chunking_type + presentation_mode → 청킹 파라미터 프롬프트 적용
  4. presentation_mode = cumulative → 각 페이지 cumulative_strip_text 함께 생성
  5. 페이지별 Replicate 이미지 생성 — 등록 아바타 있으면 flux-kontext-pro(캐릭터 일관성),
     없으면 flux-schnell로 순차 생성 (페이지 단위 순차 처리, §4.2 참고)
  6. DB 저장: stories(track='A', therapy_goal_tags, chunking_type, presentation_mode)
        │
        ▼
[Supabase Realtime] → 보호자에게 "가정 활용 요청" 알림
        │
        ▼
[보호자] 열람 → 확인 완료 또는 피드백 댓글
```

### 3.2 Track B — 보호자 주도 생성 플로우

```
[보호자] 자유 줄글 입력 (6WH 가이드)
        │
        ▼ POST /api/story/generate { track: 'B', chunking_type, presentation_mode }
[StoryService.createTrackB()]
  1. 줄글 → GPT-4o (6WH 추출, 보호자 친화적 언어)
  2. chunking_type + presentation_mode 파라미터 적용
  3. cumulative 시 → cumulative_strip_text 생성
  4. 페이지별 이미지 생성
  5. DB 저장: stories(track='B')
        │
        ▼
[보호자] "치료사 검토 요청" 선택 시
        │
        ▼
[치료사] 수정 제안 → 보호자 승인 플로우 (기존)
```

### 3.3 Track C — 교사 주도 생성 플로우

```
[교사] 학교 맥락 태그 + 가정 연계 메모 입력
        │
        ▼ POST /api/story/generate { track: 'C', school_context_tags, home_connection_memo }
[StoryService.createTrackC()]
  1. 줄글 → GPT-4o (6WH 추출, 학교 맥락 강조)
  2. school_context_tags 프롬프트 주입 → 또래·교실 묘사 강화
  3. chunking_type + presentation_mode 파라미터 적용 (열람용 표시, 수정 불가)
  4. cumulative 시 → cumulative_strip_text 생성
  5. DB 저장: stories(track='C', school_context_tags, home_connection_memo)
        │
        ▼
[Supabase Realtime] → 그룹 전체(보호자 + 치료사)에 자동 공유 알림
        │
        ▼
[보호자] 가정 연계 확인 + [치료사] 정합성 검토 → 수정 제안 가능
```

### 3.4 누적 제시(Cumulative) 뷰어 플로우

```
[뷰어] presentation_mode 확인
        │
  cumulative ──────────────── sequential
        │                          │
        ▼                          ▼
페이지 N 렌더링:               페이지 N 렌더링:
 - 현재 페이지 본문              - 현재 페이지 본문만
 - CumulativeStrip 표시         - 스트립 없음
   ✅ 단계1 (완료, 흐림)
   ✅ 단계2 (완료, 흐림)
   ▶ 단계3 (현재, 강조)
```

### 3.5 행동 관찰 → Track A 연결 플로우 — NEW v2.2

```
[치료사] ABC 기록 입력 (/observations)
        ↓ POST /api/observations
[ObservationService.createObservation()]
  1. ABC + 대체행동 목표 + 환경 저장
  2. AI SEAT 분류 요청 (선택) → GPT-4o 추천
  3. DB 저장: behavior_observations
        ↓
[이 관찰로 Track A 스토리 만들기] 선택
        ↓ GET /api/observations/[id]/story-input
응답: GenerateStoryInput 형식으로 변환 (raw_input은 ABC 순서를 그대로 따름 — v2.3 수정)
  - antecedent   → raw_input "[관찰된 도전 상황]"
  - behavior     → raw_input "[문제 행동]"
  - consequence  → raw_input "[현재 결과]"
  - replacement_behavior(있을 때만) → raw_input "[대체행동 목표]"
  - seat_function[] → therapy_goal_tags 자동 힌트
        ↓
Track A 생성 화면 자동 입력 후 스토리 생성
        ↓
스토리 완료 후 observation_id 링크 저장 (PATCH /api/observations/[id]/link)
```

---

## 4. 외부 서비스 통합

### 4.1 OpenAI GPT-4o

- **Track별 시스템 프롬프트 분기:**
  - Track A: 치료 목표 태그 + 지시문 강화 + Carol Gray 8th 엄격 적용
  - Track B: 보호자 친화적 언어 + 일상 맥락
  - Track C: 학교 맥락 태그 + 또래·교실 환경 묘사
- **청킹 파라미터:** `chunking_type` + `presentation_mode` 프롬프트 자동 주입
- **누적 스트립 생성:** `presentation_mode = cumulative` 시 각 페이지에 `cumulative_strip_text` 함께 생성
- **스트리밍:** Server-Sent Events (SSE) 방식 유지

### 4.2 Replicate — 이미지 생성 (2026.06 전환)

> **배경:** 기존 무료 서비스였던 Pollinations.ai가 x402 결제 프로토콜을 도입하면서
> "Queue full for IP (max: 1)" 402 에러가 상시 발생 → 사용 불가 판정. 유료지만 저렴한
> (장당 약 $0.003, ~0.6초) Replicate FLUX 계열로 전환.

- **스토리 페이지 일러스트** (`generateStoryPageImage`):
  - 아동의 기본 아바타 이미지가 **있으면** → `flux-kontext-pro`(이미지 조건부 편집 모델)에 아바타 이미지를 `input_image`로 전달, "동일 캐릭터를 새 장면에 배치" 프롬프트로 생성 → 페이지마다 얼굴·헤어·옷차림 일관성 유지
  - **없으면** → `flux-schnell`(텍스트→이미지)로 장면 묘사만으로 생성 (폴백)
  - 둘 다 `aspect_ratio: '16:9'`, `output_format: 'png'`
  - Track별 이미지 프롬프트 맥락 차이는 기존과 동일: Track A/B는 가정·치료 환경, Track C는 교실·학교 환경 묘사
  - **순차 처리:** 페이지를 한 번에 하나씩 생성 (동시 다중 요청에 따른 비용/레이트리밋 관리)
- **아바타 스튜디오** (`startAvatarPrediction`): 스타일별 모델 분기 — 지브리 `flux-2-pro`, 수채화 `flux-kontext-pro`, 사진닮은꼴/픽사 face-to-many — Replicate 예측(prediction) 비동기 폴링 방식 (변경 없음)

### 4.3 Supabase

| 기능 | 설정 |
|---|---|
| Auth | Admin API 방식 (email rate limit 우회) |
| Database | PostgreSQL, RLS 전면 적용, v3 스키마 반영 |
| Realtime | Track별 알림 채널 분기 |
| Storage | `avatars/` `story-images/` `tts-cache/` 버킷 유지 — `tts-cache`는 일반 사용자 INSERT RLS 정책이 없어 **service-role 클라이언트로 업로드**(2026.06.08 수정, §LLD 참고) |

### 4.4 Google Cloud TTS

- ko-KR-Neural2 음성 유지, 단 2026.06.08 다음 버그 수정:
  - REST `v1` `text:synthesize`에 존재하지 않는 `enableTimePointing` 필드를 요청 본문에서 제거 (모든 호출이 400 `Unknown name "enableTimePointing"` 에러로 실패하던 원인 — SSML `<mark>` 기반 타임포인팅은 추후 §6 단어 하이라이트 구현 시 `v1beta1`로 별도 도입 예정)
  - 캐시 업로드를 service-role 클라이언트로 전환 (위 Storage 항목 참고)

---

## 5. 인증 및 권한 설계

### 5.1 역할 구조 (RBAC) — v2.1 변경

```
Supabase Auth Users (user_metadata.role 저장)
        │
        ▼
MainLayout (Server Component)
  supabase.auth.getUser() → user_metadata.role
  → <SideBar role={role} /> prop 전달 (역할 배지 표시)
        │
        ▼
user_profiles 테이블 (role: parent | therapist | teacher)
        │
        ▼
Track 접근 권한:
  parent    → Track B 생성, 최종 승인권
  therapist → Track A 생성, 청킹 전략 수정 권한
  teacher   → Track C 생성
```

> **v2.1 구현 방식:** SideBar 역할 배지는 Zustand store 대신 MainLayout 서버 컴포넌트에서 `user_metadata.role`을 직접 읽어 prop으로 전달. 클라이언트 초기화 타이밍 이슈 완전 해소.

### 5.2 청킹 전략 권한 (NEW v2)

| 권한 | 보호자 | 치료사 | 교사 |
|---|---|---|---|
| `chunking_type` 열람 | ✅ | ✅ | ✅ |
| `chunking_type` 수정 | ❌ | ✅ | ❌ |
| `presentation_mode` 열람 | ✅ | ✅ | ✅ |
| `presentation_mode` 수정 | ❌ | ✅ | ❌ |

**RLS 구현:** `stories` 테이블의 `chunking_type`, `presentation_mode` 컬럼 UPDATE 정책에 `role = 'therapist'` 조건 추가

### 5.3 Track별 생성 권한

| Track | 생성 권한 |
|---|---|
| Track A | therapist만 |
| Track B | parent만 |
| Track C | teacher만 |
| Pool 기반 | 세 역할 모두 |

### 5.4 스토리 수정·삭제 권한 — NEW v2.3

```
스토리 제목 수정 (PATCH /api/story/:id)
  - 허용 필드: title만 (그 외 필드는 차단)
  - 조건: story.creator_id === user.id (역할 무관, creator 기준)
  - UI: EditableStoryTitle — isCreator일 때만 연필 아이콘 노출

스토리 본문 수정
  - 별도 편집 화면 없음 → 자문 댓글 + 수정 제안 → 보호자 승인 플로우로만 반영

스토리 삭제 (DELETE /api/story/:id)
  - 허용 조건: child.parent_id === user.id (자녀 소유 보호자) OR story.creator_id === user.id (생성자)
  - Storage pages/{storyId}/ 이미지 선삭제 후 DB 행 삭제
  - UI: DeleteStoryButton — isParent || isCreator일 때 노출
```

> **app-level 권한 ↔ RLS 정책 동기화 원칙:** API 핸들러의 인가 조건과 해당 테이블의 RLS 정책(UPDATE/DELETE)은 항상 1:1로 맞춰야 한다. 둘 중 하나만 갱신하면 "API는 200을 반환하지만 RLS가 0행을 처리해 실제로는 아무 일도 일어나지 않는" silent failure가 발생한다 (`stories` DELETE 정책 — 마이그레이션 005에서 보호자 조건만 추가했다가, 치료사 creator 조건이 빠져 마이그레이션 013에서 보강한 사례). permissive 정책은 OR로 합쳐지므로 새 역할 조건은 기존 정책을 건드리지 않고 추가 정책으로 안전하게 확장 가능하다.

---

## 6. 실시간 통신 설계

### 6.1 Supabase Realtime 채널 — Track별 알림 분기 (v2 변경)

```
채널: group:{group_id}
  이벤트:
  - story:created:trackA    → 보호자에게 "가정 활용 요청" 알림
  - story:created:trackB    → 치료사에게 "검토 요청" 알림 (선택적)
  - story:created:trackC    → 보호자 + 치료사 전체에 "새 스토리" 알림
  - approval:created        → 보호자에게 승인 요청 알림
  - approval:updated        → 요청자에게 결과 알림
  - comment:created         → 그룹 멤버 전체 알림
```

### 6.2 알림 매트릭스 구현

```typescript
function notifyByTrack(track: 'A' | 'B' | 'C', groupId: string, storyId: string) {
  switch(track) {
    case 'A': notifyParent(groupId, '치료사가 스토리를 만들었어요', storyId)
    case 'B': notifyTherapist(groupId, '보호자가 검토를 요청했어요', storyId) // 선택적
    case 'C': notifyAll(groupId, '선생님이 새 스토리를 공유했어요', storyId)
  }
}
```

---

## 7. AI 파이프라인 설계

### 7.1 스토리 생성 파이프라인 — v2 확장

```
STAGE 1: 6WH 추출 (Track별 프롬프트 분기)
Input:  자유 줄글 + 아동 프로필 + track + 태그(선택)
Output: { who, when, where, what, how, why, missing[], child_name }

STAGE 2: 소셜 스토리 생성 (청킹 파라미터 적용)
Input:  6WH + 아동 프로필 + chunking_type + presentation_mode + track 특화 지시
Output: [
  {
    page_number, page_type,
    chunking_label,           ← 청킹 유형에 따른 표지어
    descriptive, perspective, coaching,
    image_prompt,
    cumulative_strip_text     ← NEW v2: presentation_mode=cumulative 시에만 생성
  }, ...
]

STAGE 3: 이미지 생성 (페이지별 병렬, Track별 맥락 반영)
Input:  image_prompt + 아바타 스타일 + Track 맥락 (가정/교실)
Output: image_url → Supabase Storage 저장
```

### 7.2 청킹 유형별 프롬프트 수식어 (v2 상세화)

| 청킹 유형 | 프롬프트 지시 |
|---|---|
| `temporal` | "각 본문 페이지는 '먼저', '그 다음', '마지막으로' 시간 표지어로 시작. EF 점수 M=61.88" |
| `spatial` | "각 본문 페이지는 '[장소]에서,' 공간 맥락 표지어로 시작. EF 점수 M=65.23" |
| `mixed` ⭐ | "각 본문 페이지는 '[장소]에서, [시간표지어]' 형태로 시작. 디폴트. EF 점수 M=74.68" |

### 7.3 제시 방식별 프롬프트 수식어 (NEW v2)

| 제시 방식 | 프롬프트 지시 |
|---|---|
| `cumulative` ⭐ | "각 페이지마다 `cumulative_strip_text` 필드를 생성하세요. 완료 단계(✅)와 현재 단계(▶)를 포함하는 1~3줄 텍스트. 미래 단계는 포함하지 마세요." |
| `sequential` | "`cumulative_strip_text`는 null로 설정하세요." |

### 7.4 Track별 시스템 프롬프트 특화 지시

| Track | 추가 지시 |
|---|---|
| A (치료사) | "치료 목표 태그: {tags}. 지시문(Coaching)을 치료 목표 행동과 직접 연결하세요. Carol Gray 8th 기준(서술 우선·코칭 최소화)을 엄격 적용하되, 목표 행동 지시문은 명확하게 작성하세요." |
| B (보호자) | "보호자가 일상에서 관찰한 상황입니다. 전문 용어를 사용하지 말고 아동 친화적 언어로 작성하세요." |
| C (교사) | "학교 맥락 태그: {tags}. 또래 상호작용과 교실 환경을 중심으로 묘사하세요. 가정 연계 메모: {memo}" |

### 7.5 SEAT 기능 분석 파이프라인 — v2.2 (v2.3에서 대체행동 제안 추가)

```
STAGE 1: ABC 텍스트 입력
Input:  antecedent + behavior + consequence
Output: {
  seat_function: ['S'|'E'|'A'|'T'], confidence: number, rationale: string,
  replacement_behavior_suggestion: string   ← NEW v2.3: AI가 대체행동 목표 문구도 함께 제안
}

STAGE 2: Track A 프롬프트 주입 (ABC 연결 시)
  - behavior_observations.antecedent → "[관찰된 도전 상황]"으로 프롬프트 주입
  - replacement_behavior → 지시문(Coaching)의 목표 행동으로 명시
  - SEAT 분류 → 치료 목표 태그 힌트 (AI가 자동 연결하지 않고 치료사에게 제안)
```

> **AI 제안 → 인간 검증 패턴:** `replacement_behavior_suggestion`은 "⭐ AI 추천" 박스로 노출되며, 치료사가 "이 제안 적용하기"를 눌러야만 실제 입력값에 반영된다 (자동 적용 없음). SEAT 분류·대체행동 제안 모두 동일한 검증 패턴을 따른다.

### 7.6 AI 제목 자동 생성 파이프라인 — NEW v2.3

```
Input:  6WH 추출 결과(sixWh) + 아동 프로필 + chunking_type
Output: 15~25자 문장형 한국어 제목 (예: "민준이의 급식 줄 서기 연습 이야기")

실행 방식:
  - generateStoryTitle()을 generateStoryStream()과 Promise.all()로 병렬 실행
    → 본문 생성과 동시에 진행되어 추가 지연 없음
  - 실패 시 폴백: `${child.name}의 이야기`
  - 기존 "[아이이름(나이)/청킹유형] 키워드형 10자 이내" 형식의 대괄호 메타정보 prefix는 제거
```

> **인라인 수정과의 연계:** 생성된 제목은 고정이 아니며, creator는 상세 페이지의 `EditableStoryTitle`에서 언제든 인라인으로 다시 수정할 수 있다 (§5.4 참고).

---

## 8. 배포 아키텍처

```
GitHub Repository
        │
        ▼ Push to main
Vercel CI/CD Pipeline
  ├── Next.js 16 Build (Turbopack)
  ├── Edge Runtime 배포
  └── Static Assets CDN

환경 변수:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY     ← Admin API용 (signup, chunking 권한 검증) +
                                   tts-cache/story-images 업로드 (RLS 우회)
  OPENAI_API_KEY                ← GPT-4o 텍스트 생성 전용
  REPLICATE_API_KEY             ← 이미지 생성 (FLUX 계열, 2026.06 신규)
  GOOGLE_TTS_API_KEY
```

---

## 9. 보안 설계

| 영역 | 조치 |
|---|---|
| API 키 | 서버 사이드 전용 |
| Track 권한 | API 레이어에서 role 검증 (track=A → therapist만 허용) |
| 청킹 설정 수정 | `PATCH /api/story/:id` 에서 role=therapist 검증 후 chunking_type/presentation_mode 업데이트 허용 |
| RLS | 모든 Supabase 쿼리에 인증 사용자 확인 |
| 아동 데이터 | Storage 비공개 버킷, GDPR 준수 |
| Rate Limiting | Admin API signUp 사용으로 email rate limit 우회 (개발) |

---

## v1.0 → v2.0 변경 요약

| 섹션 | 변경 내용 |
|---|---|
| §2 컴포넌트 구조 | Track A/B/C 페이지 분기 추가; ChunkingStrategyPanel, CumulativeStrip, TrackBadge, TherapyGoalTags, SchoolContextTags 신규 컴포넌트 |
| §3 데이터 플로우 | Track별 생성 플로우 3개로 확장; 누적 제시 뷰어 플로우 추가 |
| §5 권한 설계 | Track별 생성 권한 + 청킹 전략 수정 권한(치료사 전용) 추가 |
| §6 실시간 통신 | Track별 알림 이벤트 분기 추가 |
| §7 AI 파이프라인 | presentation_mode 파라미터 + cumulative_strip_text 생성 단계 추가; Track별 시스템 프롬프트 특화 지시 추가 |

## v2.0 → v2.1 변경 요약 (2026.06.06)

| 섹션 | 변경 내용 |
|---|---|
| §2 컴포넌트 구조 | ChildSelectorPanel 신규 추가 (아이 선택 패널, 모바일/PC 반응형) |
| §5 인증·권한 설계 | SideBar 역할 배지 구현 방식 명세 추가 (MainLayout server component → prop 전달) |
| §2 IA 라우팅 | /profile, /avatar-studio 페이지 분리 명세 |

## v2.1 → v2.2 변경 요약 (2026.06.08)

| 섹션 | 변경 내용 |
|---|---|
| §2 컴포넌트 구조 | /observations 라우트 신규; ObservationForm, SeatSelector, ObservationHistory, StoryLinkButton 컴포넌트 추가 |
| §3 데이터 플로우 | 3.5 ABC→Track A 연결 플로우 신규 삽입 |
| §7 AI 파이프라인 | 7.5 SEAT 기능 분석 파이프라인 추가; Track A 프롬프트에 ABC 콘텍스트 주입 명세 추가 |

## v2.2 → v2.3 변경 요약 (2026.06.08)

| 섹션 | 변경 내용 |
|---|---|
| §2 컴포넌트 구조 | `/bookshelf` "브릿지 책장" 라우트 신규(트랙 필터 + RLS-only 전체 조회); `EditableStoryTitle`, `DeleteStoryButton` 컴포넌트 추가; SideBar/BottomNavBar에 책장 메뉴(BookOpen) 반영 |
| §3 데이터 플로우 | 3.5 ABC→Track A 매핑을 raw_input 실제 저장 순서(관찰된 도전 상황 → 문제 행동 → 현재 결과 → 대체행동 목표)로 정정 |
| §5 인증·권한 설계 | 5.4 스토리 수정·삭제 권한 신규 — title만 인라인 수정(creator 기준), 본문은 자문·승인 플로우, 삭제는 자녀 소유 보호자 OR creator; app-level 권한과 RLS 정책 1:1 동기화 원칙(silent failure 방지) 명문화 |
| §7 AI 파이프라인 | 7.5에 `replacement_behavior_suggestion`(AI 추천→치료사 검증 패턴) 추가; 7.6 AI 제목 자동 생성 파이프라인(문장형 요약, 본문 생성과 병렬, 인라인 재수정 연계) 신규 |

## v2.3 → v2.4 변경 요약 (2026.06.08)

| 섹션 | 변경 내용 |
|---|---|
| §1 EXTERNAL SERVICES 다이어그램 | OpenAI/DALL·E 3 박스를 분리해 **Replicate(FLUX 계열)** 박스 신규 추가; Pollinations.ai/DALL·E 3 → Replicate 전환 배경(x402 결제 정책 변경) 명시 |
| §2.2 백엔드 서비스 분해 | AvatarService·StoryService·TTSService 책임 정정 — Replicate 모델 분기, 페이지 일러스트 생성, service-role 캐싱 업로드 반영 |
| §3.1 Track A 데이터 플로우 | "5. 페이지별 DALL·E 3 이미지 생성(병렬)" → "Replicate 이미지 생성 — 아바타 유무에 따라 flux-kontext-pro/flux-schnell 분기, 순차 처리"로 정정 (실제 코드는 병렬이 아닌 순차 처리) |
| §4.2 (구 OpenAI DALL·E 3 → Replicate로 교체) | 신규 섹션: 전환 배경, `flux-kontext-pro`(아바타 기반 캐릭터 일관성)/`flux-schnell`(폴백) 분기 로직, 아바타 스튜디오 모델 매핑 명시 |
| §4.3 Supabase Storage | `tts-cache` 버킷이 일반 사용자 INSERT RLS 정책 부재로 service-role 클라이언트 업로드가 필요함을 명시 |
| §4.4 Google Cloud TTS | "변경 없음" → 2026.06.08 버그 수정 내역(`enableTimePointing` 필드 제거, service-role 캐싱) 반영 |
| §8 환경 변수 | `REPLICATE_API_KEY` 신규 추가, `OPENAI_API_KEY`를 "GPT-4o 텍스트 생성 전용"으로 범위 명확화, `SUPABASE_SERVICE_ROLE_KEY` 용도에 Storage 업로드(RLS 우회) 추가 |

---

*StoryBridge HLD v2.4 | 2026.06.08*
