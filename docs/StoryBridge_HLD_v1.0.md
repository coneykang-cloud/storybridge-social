# StoryBridge HLD (High-Level Design)

**버전:** v1.0  
**작성일:** 2026.06.04  
**작성자:** 강현정  
**참조:** StoryBridge_PRD_v1.0.md

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
│   Browser / Mobile Web (Next.js 14 App Router, React 18)        │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│   │  보호자 UI    │  │  치료사 UI   │  │  선생님 UI / 뷰어     │  │
│   └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└──────────┼─────────────────┼───────────────────────┼────────────┘
           │                 │                       │
           ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER LAYER                             │
│                                                                  │
│   Next.js API Routes (Edge / Node.js Runtime)                   │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│   │  Auth API    │  │  Story API   │  │   Avatar API          │  │
│   │  /api/auth   │  │  /api/story  │  │   /api/avatar         │  │
│   └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│          │                 │                       │              │
│   ┌──────┴─────────────────┴───────────────────────┴──────────┐  │
│   │                  Service Layer                              │  │
│   │  StoryService | AvatarService | CollabService | TTSService │  │
│   └──────┬─────────────────┬───────────────────────┬──────────┘  │
└──────────┼─────────────────┼───────────────────────┼────────────┘
           │                 │                       │
┌──────────▼─────────────────▼───────────────────────▼────────────┐
│                       EXTERNAL SERVICES                          │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Supabase   │  │   OpenAI     │  │   Google Cloud TTS     │  │
│  │  - Auth     │  │  - GPT-4o    │  │   - Neural2 한국어      │  │
│  │  - Postgres │  │  - DALL·E 3  │  │                        │  │
│  │  - Realtime │  │              │  │                        │  │
│  │  - Storage  │  │              │  │                        │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 컴포넌트 구조

### 2.1 프론트엔드 모듈 분해

```
StoryBridge Frontend
│
├── [공개 영역] /onboarding
│   ├── 역할 선택 (parent | therapist | teacher)
│   ├── 아동 프로필 등록 (보호자 전용)
│   └── 그룹 연결 (초대 코드 입력)
│
├── [인증 영역] /dashboard
│   ├── 홈 대시보드
│   │   ├── 최근 스토리 카드 목록
│   │   ├── 연결된 그룹 현황
│   │   └── 승인 대기 배지 (보호자)
│   │
│   ├── /avatar-studio
│   │   ├── 사진 업로드 컴포넌트
│   │   ├── 스타일 선택 (4종)
│   │   ├── 생성 진행 상태 (스트리밍)
│   │   └── 아바타 라이브러리 (최대 5)
│   │
│   ├── /story/create
│   │   ├── Pool 선택 경로
│   │   │   ├── 연령대 필터
│   │   │   ├── 카테고리 필터 (A/B)
│   │   │   └── 템플릿 카드 그리드
│   │   └── AI 생성 경로
│   │       ├── 자유 줄글 입력창
│   │       ├── 6WH 가이드 체크리스트
│   │       ├── 예시 문구 선택
│   │       ├── 청킹 방식 선택
│   │       └── AI 생성 → 인라인 편집
│   │
│   ├── /story/[id]/view
│   │   ├── Manual 모드 뷰어
│   │   ├── Auto Play 모드
│   │   ├── Slideshow 모드
│   │   ├── TTS 컨트롤러
│   │   └── 단어 하이라이트
│   │
│   └── /collab/[groupId]
│       ├── 그룹 멤버 목록
│       ├── 자문 댓글 피드
│       ├── 수정 제안 카드
│       └── 승인/거절 비교 뷰
│
└── [공통 컴포넌트]
    ├── BottomNavBar (모바일)
    ├── SideBar (태블릿/데스크톱)
    ├── NotificationBadge
    ├── AvatarDisplay
    └── AccessibilityToggle (고대비 모드)
```

### 2.2 백엔드 서비스 분해

| 서비스 | 책임 | 주요 메서드 |
|---|---|---|
| **AuthService** | 역할 기반 인증, 세션 관리 | signUp, signIn, getRole |
| **ChildService** | 아동 프로필 CRUD | createChild, updateChild, getChild |
| **AvatarService** | DALL·E 3 요청, 아바타 저장 | generateAvatar, listAvatars |
| **StoryService** | GPT-4o 생성, CRUD | createFromInput, createFromPool, updatePage |
| **TTSService** | Google TTS 요청, 음성 캐싱 | synthesize, getCached |
| **CollabService** | 그룹·댓글·승인 관리 | inviteMember, requestApproval, approve |
| **PoolService** | 템플릿 라이브러리 조회 | getByAgeAndCategory, customizeForChild |

---

## 3. 데이터 플로우

### 3.1 AI 스토리 생성 플로우

```
사용자 자유 줄글 입력
        │
        ▼
[Client] 입력 검증 + 아동 프로필 첨부
        │
        ▼ POST /api/story/generate
[API Route] 요청 파싱
        │
        ▼
[StoryService.generate()]
  1. 줄글 → GPT-4o (6WH 추출 프롬프트)
     → 6WH 구조체 반환
  2. 누락 요소 감지 → 후속 질문 생성 (있으면 클라이언트에 반환)
  3. 6WH + 아동 프로필 + 청킹 방식 → GPT-4o (소셜스토리 생성 프롬프트)
     → 스트리밍 응답 (최대 10페이지)
  4. 각 페이지: DALL·E 3 이미지 생성 (아바타 스타일 지정)
  5. Supabase stories + story_pages 저장
        │
        ▼
[Client] 실시간 스트리밍 수신 → 페이지별 인라인 편집 UI 렌더링
```

### 3.2 협업·승인 플로우

```
[치료사/선생님] 수정 사항 작성 + "승인 요청" 탭
        │
        ▼ POST /api/collab/approval/request
[API Route] approvals 테이블에 status='pending' 레코드 생성
        │
        ▼
[Supabase Realtime] approvals 채널 브로드캐스트
        │
        ▼
[보호자 클라이언트] 실시간 알림 수신
  → NotificationBadge 업데이트
  → 푸시 알림 (PWA 미지원 → 인앱 알림)
        │
        ▼
[보호자] 비교 화면 (before/after diff) 확인
        │
    승인 ──────────────────────── 거절
        │                           │
        ▼                           ▼
story_pages 즉시 업데이트     원본 유지
approvals status='approved'  approvals status='rejected'
요청자에게 완료 알림          피드백 댓글 작성
```

### 3.3 TTS 음성 재생 플로우

```
[뷰어] 페이지 렌더링
        │
        ▼ GET /api/tts?text=...&voice=...
[API Route] Supabase Storage에서 캐시 확인
  → 캐시 있음: 음성 URL 즉시 반환
  → 캐시 없음: Google Cloud TTS 호출 → Storage 저장 → URL 반환
        │
        ▼
[클라이언트] Web Audio API로 재생
  → 재생 위치에 따라 단어 하이라이트 동기화
```

---

## 4. 외부 서비스 통합

### 4.1 OpenAI GPT-4o

- **용도:** 스토리 자동생성, 6WH 추출, 후속 질문 생성
- **방식:** Streaming (Server-Sent Events via OpenAI SDK)
- **비용 최적화:** 프롬프트 템플릿 캐싱, 최대 토큰 제한
- **에러 처리:** Rate limit → 재시도 큐 (3회), 타임아웃 30초

### 4.2 OpenAI DALL·E 3

- **용도:** 아바타 생성, 스토리 페이지 배경 이미지
- **방식:** 비동기 요청 (Polling → 완료 시 URL 저장)
- **스타일별 시스템 프롬프트:** 지브리풍 / 사진닮은꼴 / 픽사풍 / 수채화
- **비용:** 1024×1024 기준 요청당 약 $0.04 → 아바타 생성 횟수 제한

### 4.3 Supabase

| 기능 | 설정 |
|---|---|
| Auth | 이메일/PW + 구글 소셜 로그인, JWT 기반 세션 |
| Database | PostgreSQL 15, RLS 전면 적용 |
| Realtime | 협업 채널 per group_id |
| Storage | `avatars/` `story-images/` `tts-cache/` 버킷 분리 |

### 4.4 Google Cloud TTS

- **음성:** `ko-KR-Neural2-A` (여성), `ko-KR-Neural2-B` (남성), `ko-KR-Neural2-C` (아동)
- **포맷:** MP3, 샘플레이트 24000Hz
- **캐싱:** Supabase Storage에 텍스트 해시 기반 저장 (중복 비용 방지)

---

## 5. 인증 및 권한 설계

### 5.1 역할 구조 (RBAC)

```
Supabase Auth Users
        │
        ▼
user_profiles 테이블 (role: parent | therapist | teacher)
        │
        ▼
Row Level Security (RLS) 정책
  - parent: 본인 아동의 모든 데이터 읽기/쓰기
  - therapist: 그룹에 속한 아동 데이터 읽기, 수정 제안만 가능
  - teacher: therapist와 동일
```

### 5.2 RLS 핵심 정책

| 테이블 | 정책 |
|---|---|
| children | 본인 user_id 일치 OR 동일 group 멤버 (읽기) |
| stories | children 소유자 OR group 멤버 |
| story_pages | 부모 story에 준함 |
| approvals | 요청자 OR 보호자 (소유자) |
| comments | group 멤버 전체 |

---

## 6. 실시간 통신 설계

### 6.1 Supabase Realtime 채널 구조

```
채널: group:{group_id}
  이벤트:
  - approval:created    → 보호자에게 승인 요청 알림
  - approval:updated    → 요청자에게 결과 알림
  - comment:created     → 그룹 멤버 전체 알림
  - story:updated       → 그룹 멤버 스토리 동기화
```

### 6.2 알림 전달 방식

- **인앱 알림:** Supabase Realtime 구독 (WebSocket)
- **이메일 알림:** Supabase Edge Function + Resend API (선택적)
- **PWA 푸시:** MVP에서 제외 (v2)

---

## 7. AI 파이프라인 설계

### 7.1 스토리 생성 프롬프트 파이프라인

```
STAGE 1: 6WH 추출
Input:  자유 줄글 + 아동 프로필
System: "당신은 Carol Gray Social Stories 전문가입니다.
         다음 텍스트에서 6WH(누가/언제/어디서/무엇을/어떻게/왜)를 추출하세요.
         JSON 형식으로 반환하세요."
Output: { who, when, where, what, how, why, missing[] }

STAGE 2: 소셜 스토리 생성
Input:  6WH 구조체 + 아동 프로필 + 청킹 방식 + Carol Gray 규칙
System: "당신은 ASD 아동을 위한 소셜 스토리 작가입니다.
         Carol Gray 10.4 기준을 완벽히 준수하세요:
         - 설명문(Descriptive) + 조망문(Perspective) : 지시문(Coaching) = 4:1
         - 긍정 문장 최소 50%
         - 아동 이름으로 1인칭 서술
         - {chunking_type} 청킹 방식 적용
         - 최대 10페이지 (도입 1 + 본문 최대 8 + 결론 1)
         각 페이지를 JSON 배열로 반환하세요."
Output: [ { type, sentence_type, text, image_prompt }, ... ]

STAGE 3: 이미지 생성 (페이지별 병렬)
Input:  image_prompt + 아바타 스타일
DALL·E 3 → image_url → Supabase Storage 저장
```

### 7.2 청킹 방식별 프롬프트 수식어

| 청킹 유형 | 프롬프트 추가 지시 |
|---|---|
| 시간적 | "각 페이지는 '먼저', '그 다음', '마지막으로' 시간 표지어로 시작하세요." |
| 공간적 | "각 페이지는 장소 맥락('[장소]에서')으로 시작하세요." |
| 혼합 | "시간 표지어와 공간 맥락을 함께 사용하세요." |

---

## 8. 배포 아키텍처

```
GitHub Repository
        │
        ▼ Push to main
Vercel CI/CD Pipeline
  ├── Next.js Build
  ├── Edge Runtime 배포 (API Routes)
  └── Static Assets CDN

환경 변수 (Vercel Dashboard):
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  OPENAI_API_KEY
  GOOGLE_TTS_API_KEY
```

---

## 9. 보안 설계

| 영역 | 조치 |
|---|---|
| API 키 | 서버 사이드 전용 (클라이언트 노출 없음) |
| 이미지 업로드 | 파일 타입 검증, 최대 5MB, 얼굴 감지 (선택) |
| RLS | 모든 Supabase 쿼리에 인증 사용자 확인 |
| Rate Limiting | Vercel Edge Rate Limit (AI API 과다 호출 방지) |
| 아동 데이터 | GDPR/개인정보보호법 준수, 아동 사진 Storage 비공개 버킷 |
| HTTPS | Vercel 자동 SSL 적용 |

---

*StoryBridge HLD v1.0 | 2026.06.04*
