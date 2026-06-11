# StoryBridge LLD (Low-Level Design) v2.0

**버전:** v2.6  
**작성일:** 2026.06.05 / 최종 업데이트: 2026.06.09  
**작성자:** 강현정  
**참조:** PRD v3.5 / HLD v2.5 / TDD v1.5 / Plan v2.6.md  
**변경 이력:** v1.0 → v2.0 (3-Track 모델, 청킹 2차원화, 누적 제시 UI 반영) / v2.0 → v2.1 (연령대 5구간, migration 004, ChildSelectorPanel, 타입 업데이트) / v2.1 → v2.2 (migration 004 실행 완료로 상태 정정, migration 005 stories DELETE RLS 정책 추가 반영) / v2.2 → v2.3 (behavior_observations 테이블 설계 및 API 추가) / v2.3 → v2.4 (마이그레이션 007~013 반영, 브릿지 책장·제목 인라인 수정·creator 삭제 권한 등 코드 구현 동기화) / v2.4 → v2.5 (이미지 생성 파이프라인 Replicate 전환 + 아바타 기반 캐릭터 일관성 함수 명세, TTS API·서비스 신규 추가 및 버그 수정 3건 반영) / v2.5 → v2.6 (아이(child) 역할 — migration 014, UserRole 타입 확장, 미들웨어 child 보호 로직, SideBar/BottomNavBar 필터링, BookshelfClient ChildConnectForm, 그룹 참여 API child 허용, Badge/Settings 컴포넌트 child 지원)

---

## 목차

1. [데이터베이스 스키마 상세](#1-데이터베이스-스키마-상세)
2. [API 엔드포인트 명세](#2-api-엔드포인트-명세)
3. [컴포넌트 상세 명세](#3-컴포넌트-상세-명세)
4. [상태 관리 설계](#4-상태-관리-설계)
5. [AI 프롬프트 템플릿](#5-ai-프롬프트-템플릿)
6. [파일 구조](#6-파일-구조)
7. [TypeScript 타입 정의](#7-typescript-타입-정의)
8. [환경 변수 명세](#8-환경-변수-명세)

---

## 1. 데이터베이스 스키마 상세

### 1.1 user_profiles

```sql
CREATE TABLE public.user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('parent', 'therapist', 'teacher', 'child')),
  -- ↑ migration 014 (2026-06-09): 'child' 추가
  phone        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 children (v2.1 변경 — 연령대 5구간)

```sql
CREATE TABLE public.children (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  birth_year      INTEGER NOT NULL,
  age_group       TEXT NOT NULL CHECK (age_group IN ('5-6', '7-9', '10-12', '13-15', '16-18')),
  -- v2.1: 3구간('7-9','10-13','14-18') → 5구간으로 개편 (migration 004)
  interests       TEXT[] DEFAULT '{}',
  familiar_envs   TEXT[] DEFAULT '{}',
  notes           TEXT,
  avatar_id       UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 stories — v2 변경 (신규 컬럼 추가)

```sql
CREATE TABLE public.stories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id              UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  creator_id            UUID NOT NULL REFERENCES user_profiles(id),
  title                 TEXT NOT NULL,

  -- ── v2 신규: Track 정보 ──────────────────────────────────
  track                 TEXT NOT NULL DEFAULT 'B'
                          CHECK (track IN ('A', 'B', 'C')),
                          -- A: 치료사 주도 / B: 보호자 주도 / C: 교사 주도
  created_by_role       TEXT NOT NULL
                          CHECK (created_by_role IN ('parent', 'therapist', 'teacher')),

  -- ── v2 신규: 청킹 전략 2차원 ─────────────────────────────
  chunking_type         TEXT NOT NULL DEFAULT 'mixed'
                          CHECK (chunking_type IN ('temporal', 'spatial', 'mixed')),
  presentation_mode     TEXT NOT NULL DEFAULT 'cumulative'
                          CHECK (presentation_mode IN ('cumulative', 'sequential')),

  -- ── v2 신규: Track별 전용 필드 ───────────────────────────
  therapy_goal_tags     TEXT[] DEFAULT '{}',
                          -- Track A 전용: 치료 목표 태그
  school_context_tags   TEXT[] DEFAULT '{}',
                          -- Track C 전용: 학교 맥락 태그
  home_connection_memo  TEXT,
                          -- Track C 전용: 가정 연계 메모

  -- ── 기존 필드 유지 ───────────────────────────────────────
  source                TEXT NOT NULL DEFAULT 'ai'
                          CHECK (source IN ('ai', 'pool', 'manual')),
  pool_template_id      UUID REFERENCES story_pool(id),
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'published', 'archived')),
  raw_input             TEXT,
  six_wh                JSONB,
  page_count            INTEGER DEFAULT 0 CHECK (page_count <= 10),

  -- ── migration 006: ABC 관찰 연결 (nullable FK) ───────────
  observation_id        UUID REFERENCES public.behavior_observations(id) ON DELETE SET NULL,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── v2 신규: 청킹 전략 수정 권한 (치료사 전용) RLS ──────────
-- 치료사만 chunking_type, presentation_mode 수정 가능
CREATE POLICY "치료사 청킹 설정 수정" ON stories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'therapist'
    )
  )
  WITH CHECK (true);

-- ── v2.3 신규: DELETE 정책 (005 + 013, permissive하게 OR로 합쳐짐) ──
-- 005: 자녀 소유 보호자 (children.parent_id = auth.uid())
-- 013: 생성자 본인 (creator_id = auth.uid()) — 치료사·교사가 만든 스토리 삭제용
CREATE POLICY "생성자 스토리 삭제" ON public.stories FOR DELETE USING (
  creator_id = auth.uid()
);
```

> **주의 — RLS silent failure:** UPDATE/DELETE는 매칭되는 정책이 없어도 에러 없이 0행 처리된다. 새 mutation 권한을 추가할 때는 항상 API 인가 조건과 RLS 정책을 1:1로 맞출 것 (§5.4 of HLD v2.3 참고, 마이그레이션 005/013이 같은 패턴의 버그를 두 번 수정한 사례).

### 1.4 story_pages — v2 변경 (cumulative_strip_text 추가)

```sql
CREATE TABLE public.story_pages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id              UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  page_number           INTEGER NOT NULL CHECK (page_number BETWEEN 1 AND 10),
  page_type             TEXT NOT NULL CHECK (page_type IN ('intro', 'body', 'conclusion')),
  image_url             TEXT,
  image_prompt          TEXT,
  descriptive           TEXT,
  perspective           TEXT,
  coaching              TEXT,
  chunking_label        TEXT,

  -- ── v2 신규 ───────────────────────────────────────────────
  cumulative_strip_text TEXT,
    -- 누적 제시(cumulative) 모드 시 절차 진행 스트립 텍스트
    -- 예: "✅ 먼저, 급식실에 도착했어요\n✅ 그 다음, 줄에 섰어요\n▶ 지금, 차례를 기다려요"
    -- sequential 모드 시 NULL

  tts_url               TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (story_id, page_number)
);
```

### 1.5 approvals — v2 변경 (track 컬럼 추가)

```sql
CREATE TABLE public.approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  page_id         UUID REFERENCES story_pages(id),
  requester_id    UUID NOT NULL REFERENCES user_profiles(id),
  track           TEXT CHECK (track IN ('A', 'B', 'C')),
                    -- 어느 Track에서 발생한 승인 요청인지
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  diff_before     JSONB NOT NULL DEFAULT '{}',
  diff_after      JSONB NOT NULL DEFAULT '{}',
  feedback        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);
```

### 1.6 마이그레이션 이력

| 파일 | 내용 | 상태 |
|---|---|---|
| `001_initial_schema.sql` | 전체 테이블 + RLS + 인덱스 | ✅ 실행 완료 |
| `002_seed_story_pool.sql` | 18개 템플릿 시드 데이터 | ✅ 실행 완료 |
| `003_v2_schema_update.sql` | Track·청킹·누적제시 컬럼 추가 | ✅ 실행 완료 |
| `004_age_group_5segments.sql` | children/story_pool 연령대 5구간 변경 | ✅ 실행 완료 |
| `005_stories_delete_policy.sql` | stories DELETE RLS 정책 추가 (보호자 삭제 권한, child.parent_id 기준) | ✅ 실행 완료 (2026-06-07) |
| `006_behavior_observations.sql` | behavior_observations 테이블 + RLS(치료사 전용); stories에 observation_id FK 추가 | ✅ 실행 완료 |
| `007_observations_all_roles.sql` | `therapist_id`→`recorder_id` 컬럼명 변경 + `recorder_role` 추가; 모든 역할이 관찰 기록 작성 가능하도록 RLS 재정의 (SEAT·대체행동 컬럼은 API 레이어에서 치료사 전용 검증) | ✅ 실행 완료 (2026-06-08) |
| `008_observations_shared_access.sql` | 같은 아이에 접근권 있는 그룹 멤버는 작성자 무관 조회 가능; 치료사는 타인 기록의 SEAT 분류·대체행동 필드도 수정 가능하도록 SELECT/UPDATE 정책 확장 | ✅ 실행 완료 (2026-06-08) |
| `009~011_groups_rls_policies*.sql` | groups/group_members RLS 시행착오 (deny-all → 무한 재귀 2종 → 롤백) | ✅ 실행 완료 (최종본 012로 대체) |
| `012_groups_rls_policies_v3.sql` | groups/group_members 최종 RLS — `is_group_member()`/`is_child_parent()`를 `LANGUAGE plpgsql SECURITY DEFINER` 헬퍼로 분리해 cross-table 순환 해결 | ✅ 실행 완료 (2026-06-08) |
| `013_stories_delete_creator.sql` | stories DELETE RLS에 `creator_id = auth.uid()` 조건 추가 (치료사 등 creator의 본인 생성 스토리 삭제 허용) | ✅ 실행 완료 (2026-06-08) |
| `014_add_child_role.sql` | `user_profiles.role` 및 `group_members.role` CHECK 제약에 'child' 추가 — child 역할 회원가입 가능하도록 | ✅ 실행 완료 (2026-06-09) |

### 1.7 v2 추가 마이그레이션 SQL

```sql
-- 기존 stories 테이블이 있는 경우 컬럼 추가
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS track                TEXT NOT NULL DEFAULT 'B'
    CHECK (track IN ('A', 'B', 'C')),
  ADD COLUMN IF NOT EXISTS created_by_role      TEXT NOT NULL DEFAULT 'parent'
    CHECK (created_by_role IN ('parent', 'therapist', 'teacher')),
  ADD COLUMN IF NOT EXISTS chunking_type        TEXT NOT NULL DEFAULT 'mixed'
    CHECK (chunking_type IN ('temporal', 'spatial', 'mixed')),
  ADD COLUMN IF NOT EXISTS presentation_mode    TEXT NOT NULL DEFAULT 'cumulative'
    CHECK (presentation_mode IN ('cumulative', 'sequential')),
  ADD COLUMN IF NOT EXISTS therapy_goal_tags    TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS school_context_tags  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS home_connection_memo TEXT;

-- 기존 story_pages 테이블에 컬럼 추가
ALTER TABLE public.story_pages
  ADD COLUMN IF NOT EXISTS cumulative_strip_text TEXT;

-- 기존 approvals 테이블에 컬럼 추가
ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS track TEXT CHECK (track IN ('A', 'B', 'C'));

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_stories_track ON stories(track);
CREATE INDEX IF NOT EXISTS idx_stories_presentation_mode ON stories(presentation_mode);
```

### 1.8 behavior_observations 테이블 — v2.3 (migration 006, 이후 007/008로 권한 확장)

```sql
-- 006_behavior_observations.sql — 최초 도입 (치료사 전용으로 시작)

-- stories에 observation_id FK 컬럼 추가
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS observation_id UUID REFERENCES public.behavior_observations(id) ON DELETE SET NULL;

-- 신규 테이블 생성 (컬럼명은 이후 007에서 recorder_id로 변경됨 — 아래 최종본 참고)
CREATE TABLE IF NOT EXISTS public.behavior_observations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id             UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  recorder_id          UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  recorder_role        TEXT NOT NULL CHECK (recorder_role IN ('parent', 'therapist', 'teacher')),
                         -- ★ 007: therapist_id → recorder_id 컬럼명 변경 + recorder_role 추가
                         --   (모든 역할이 작성 가능하도록 확장; SEAT·대체행동은 API에서 치료사 전용 검증)
  antecedent           TEXT NOT NULL,         -- A: 선행자극
  behavior             TEXT NOT NULL,         -- B: 관찰된 행동
  consequence          TEXT NOT NULL,         -- C: 결과
  replacement_behavior TEXT,                  -- 대체행동 목표
  setting              TEXT DEFAULT 'clinic'  -- clinic | school | home
    CHECK (setting IN ('clinic', 'school', 'home')),
  seat_function        TEXT[] DEFAULT '{}',   -- ['S','E','A','T'] 복수 가능
  observed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  story_id             UUID REFERENCES public.stories(id) ON DELETE SET NULL,  -- nullable
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.behavior_observations ENABLE ROW LEVEL SECURITY;

-- ── 최종 RLS (007 → 008 누적 적용) ──────────────────────────
-- INSERT: 작성자 본인 + 아이에 대한 접근권(보호자 본인 또는 그룹 멤버) 보유자만
CREATE POLICY "observations_insert_with_child_access"
  ON public.behavior_observations FOR INSERT
  WITH CHECK (
    recorder_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.group_members gm JOIN public.groups g ON g.id = gm.group_id
        WHERE g.child_id = child_id AND gm.user_id = auth.uid()
      )
    )
  );

-- SELECT: 작성자 본인 OR 아이에 대한 접근권 보유자 (작성자 무관 — 그룹 공유 조회, 008)
CREATE POLICY "observations_select_with_child_access"
  ON public.behavior_observations FOR SELECT
  USING (
    recorder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_members gm JOIN public.groups g ON g.id = gm.group_id
      WHERE g.child_id = child_id AND gm.user_id = auth.uid()
    )
  );

-- UPDATE: 작성자 본인 OR (치료사 + 아이 접근권) — SEAT·대체행동을 타인 기록에도 보강 가능 (008)
CREATE POLICY "observations_update_with_access"
  ON public.behavior_observations FOR UPDATE
  USING (
    recorder_id = auth.uid()
    OR (
      EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
      AND (
        EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.group_members gm JOIN public.groups g ON g.id = gm.group_id
          WHERE g.child_id = child_id AND gm.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    recorder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = auth.uid() AND p.role = 'therapist')
  );

CREATE POLICY "observations_delete_own"
  ON public.behavior_observations FOR DELETE
  USING (recorder_id = auth.uid());

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_observations_child_id    ON behavior_observations(child_id);
CREATE INDEX IF NOT EXISTS idx_observations_recorder_id ON behavior_observations(recorder_id);
CREATE INDEX IF NOT EXISTS idx_observations_observed_at ON behavior_observations(observed_at DESC);
```

> **변경 이력:** 최초 설계(006)는 "치료사 본인만" 접근 가능한 `therapist_id` + `FOR ALL` 단일 정책이었으나, "보호자도 ABC를 기록하고 싶다"는 요구로 007에서 `recorder_id`/`recorder_role`로 일반화하고, 008에서 "그룹 멤버는 작성자 무관 조회 + 치료사는 타인 기록도 SEAT 보강 가능"하도록 SELECT/UPDATE를 확장했다.

---

## 2. API 엔드포인트 명세

### 2.1 스토리 생성 API — v2 변경

**POST `/api/story/generate`**

```typescript
// Request Body (실제 GenerateStoryInput, 2026-06-08 기준 — observation_id 포함)
interface GenerateStoryRequest {
  child_id:             string
  raw_input:            string

  // v2 신규
  track:                'A' | 'B' | 'C'
  chunking_type:        'temporal' | 'spatial' | 'mixed'     // 디폴트: 'mixed'
  presentation_mode:    'cumulative' | 'sequential'           // 디폴트: 'cumulative'

  // Track A 전용
  therapy_goal_tags?:   string[]
  observation_id?:      string   // ★ v2.3: ABC 관찰 연결 시 stories.observation_id로 저장

  // Track B 전용
  request_therapist_review?: boolean

  // Track C 전용
  school_context_tags?: string[]
  home_connection_memo?: string

  avatar_id?:           string
}
```

> **버그 이력 (2026-06-08 수정):** `/api/story/generate`의 INSERT가 위 필드 중 `track`, `created_by_role`, `presentation_mode`, `therapy_goal_tags`, `school_context_tags`, `home_connection_memo`, `observation_id`를 누락하고 있었음 → DB 컬럼 기본값(`track='B'`, `created_by_role='parent'`)이 모든 AI 생성 스토리에 적용되어, 치료사가 만든 스토리도 "보호자 생성" 배지로 표시되는 버그 발생. 모든 필드를 input에서 받아 저장하고, `created_by_role`은 `TRACK_META[track].role`로 derive해 `track`과 항상 일치하도록 수정. 수정 이전 생성된 행은 데이터 보정이 필요할 수 있음(§1.6 비고).

```typescript
// SSE 응답 이벤트 (v2 확장)
// event: page
// data: {
//   page_number, page_type,
//   chunking_label,
//   descriptive, perspective, coaching,
//   image_prompt,
//   cumulative_strip_text  ← NEW v2 (sequential이면 null)
// }

// event: done
// data: { story_id, page_count, track }

// event: notify  ← NEW v2
// data: { type: 'parent' | 'therapist' | 'all', message: string }

// event: clarify
// data: { questions: string[] }
```

**권한 검증 (서버 사이드):**
```typescript
// Track별 생성 권한 확인
if (track === 'A' && userRole !== 'therapist') return 403
if (track === 'B' && userRole !== 'parent')    return 403
if (track === 'C' && userRole !== 'teacher')   return 403
```

### 2.2 청킹 전략 수정 API — NEW v2

**PATCH `/api/story/[id]/chunking`**

```typescript
// Request
interface UpdateChunkingRequest {
  chunking_type?:     'temporal' | 'spatial' | 'mixed'
  presentation_mode?: 'cumulative' | 'sequential'
}

// 치료사만 허용
// 권한 오류 시 403 반환

// Response
{ story: Story }
```

### 2.3 Track별 알림 API — NEW v2

**POST `/api/story/[id]/notify`**

```typescript
// Request
interface NotifyRequest {
  type: 'home_request'      // Track A: 보호자에게 가정 활용 요청
      | 'therapist_review'  // Track B: 치료사 검토 요청
      | 'group_share'       // Track C: 그룹 전체 공유
}

// Response
{ notified_count: number }
```

### 2.4 기존 API 변경사항

| 엔드포인트 | 변경 내용 |
|---|---|
| `GET /api/story` | 응답에 `track`, `chunking_type`, `presentation_mode` 포함 |
| `GET /api/story/[id]` | 응답에 Track 전용 필드 포함 |
| `GET /api/story/[id]/view` | `cumulative_strip_text` 포함한 pages 반환 |
| `POST /api/approval` | `track` 필드 추가 |
| `PATCH /api/story/[id]` | v2.3: 제목 인라인 수정·권한 보안 강화 (아래 2.4.1) |
| `DELETE /api/story/[id]` | v2.3: creator도 삭제 가능하도록 인가 조건 확장 (아래 2.4.2) |

#### 2.4.1 PATCH `/api/story/[id]` — 제목 수정 (v2.3, 보안 수정)

```typescript
// Request
{ title: string }

// 검증 순서
// 1. typeof title === 'string' && title.trim() 비어있지 않음 → 아니면 400
// 2. story.creator_id === user.id → 아니면 403 Forbidden
// 3. stories.update({ title: title.trim(), updated_at: now }) — title 외 필드는 절대 받지 않음

// Response
{ data: Story }
```

> **보안 수정 이력 (2026-06-08):** 기존 핸들러는 인증만 확인하고 소유권·필드 제한이 전혀 없어 **로그인한 사용자라면 누구나 임의 스토리의 아무 필드나 수정 가능한 보안 구멍**이었음. `title` 필드 + `creator_id` 검증만 허용하도록 전면 재작성. UI는 `EditableStoryTitle`(§3.12)에서 호출하며 `editable = (story.creator_id === user.id)`일 때만 노출.

#### 2.4.2 DELETE `/api/story/[id]` — 삭제 (v2.3, 인가 조건 확장)

```typescript
// 인가 조건: child.parent_id === user.id (자녀 소유 보호자) OR story.creator_id === user.id (생성자)
// 1. 위 조건 통과 시 Storage `pages/{storyId}/` 폴더 이미지 선삭제
// 2. stories.delete().eq('id', id) — RLS 정책(005 OR 013)이 동일 조건을 커버해야 실제 삭제됨

// Response
{ ok: true }
```

> **RLS 동기화 필요 (마이그레이션 013):** API 인가 조건에 `creator_id` 분기를 추가했지만, `stories` DELETE RLS 정책(005)은 `children.parent_id`만 검사했기 때문에 치료사가 누른 삭제 버튼은 `{ ok: true }`를 반환해도 실제로는 0행 삭제로 끝나는 silent failure가 발생했다. `013_stories_delete_creator.sql`로 `creator_id = auth.uid()` permissive 정책을 추가해 해결 (§1.3 DDL 참고, OR로 합쳐짐 — 기존 정책과 충돌 없음).

### 2.5 행동 관찰 API — NEW v2.3

**POST `/api/observations`** — 신규 관찰 기록

```typescript
// Request (body)
{
  child_id:             string
  antecedent:           string
  behavior:             string
  consequence:          string
  replacement_behavior?: string
  setting?:             'clinic' | 'school' | 'home'  // 디폴트: 'clinic'
  seat_function?:       ('S' | 'E' | 'A' | 'T')[]
  observed_at?:         string   // ISO8601, 디폴트: NOW()
}

// Response
{ id: string, created_at: string }

// 권한 검증: role === 'therapist' 전용
```

**GET `/api/observations?child_id=`** — 아동별 관찰 히스토리

```typescript
// Query params: child_id (required), limit (default 20), offset (default 0)
// Response
{
  observations: BehaviorObservation[]
  total: number
}
```

**POST `/api/observations/[id]/analyze`** — SEAT AI 분석

```typescript
// Request: body 없음 (기존 관찰 id로 GPT-4o 호출)
// Response
{
  seat_function: ('S' | 'E' | 'A' | 'T')[]
  confidence:    number          // 0~1
  rationale:     string          // GPT-4o 분류 근거 한국어 1줄
}
// PATCH 자동 저장: behavior_observations.seat_function 업데이트
```

**GET `/api/observations/[id]/story-input`** — Track A 입력 데이터로 변환 (실제 구현, 2026-06-08 raw_input 순서 수정 반영)

```typescript
// 권한: role === 'therapist' 전용 (RLS가 본인 또는 그룹 연결된 아이의 기록으로 범위 제한)
// SEAT → therapy_goal_tags 매핑: S→감정 조절, E→행동 전환, A→사회적 의사소통, T→또래 상호작용

// Response
{
  story_input: {
    child_id:           string
    track:              'A'
    chunking_type:      'mixed'
    presentation_mode:  'cumulative'
    therapy_goal_tags:  string[]   // seat_function 매핑 결과
    observation_id:     string
    raw_input: string  // ABC 순서를 그대로 따르는 4-섹션 텍스트 (사용자 요청으로 순서 정정)
      // [관찰된 도전 상황]\n{antecedent}
      //
      // [문제 행동]\n{behavior}
      //
      // [현재 결과]\n{consequence}
      //
      // [대체행동 목표]\n{replacement_behavior}   ← 있을 때만 포함
    abc_observation: {
      antecedent:           string
      behavior:             string
      consequence:          string
      replacement_behavior?: string
    }
  }
  observation: BehaviorObservation & { child: { id, name, age_group } }
}
```

> **변경 이력 (2026-06-08):** 기존엔 `raw_input`이 antecedent 텍스트만 담고 behavior/consequence는 별도 `context_hint`로 빠져 있었으나, "관찰된 도전 상황 → 문제 행동 → 현재 결과 → 대체행동 목표" ABC 순서를 그대로 따르도록 4-섹션 bracket 포맷으로 통합. 또한 기존 `.eq('recorder_id', user.id)` 필터를 제거해 — 다른 보호자·교사가 기록한 관찰도 치료사가 그룹으로 연결돼 있으면 RLS 범위 내에서 활용 가능하도록 확장.

**PATCH `/api/observations/[id]/link`** — 스토리와 연결

```typescript
// Request
{ story_id: string }
// Response
{ success: boolean }
// 작동: behavior_observations.story_id = story_id 저장
//        stories.observation_id = observation.id 저장
```

### 2.6 음성 안내(TTS) API — NEW v2.5 (정상화 완료)

**GET `/api/tts?text=&voice=`** — `src/app/api/tts/route.ts`

```typescript
// Query params
// text:  string (required) — 읽어줄 한국어 텍스트
// voice: 'male' | 'female' | 'child'  (디폴트: 'female')

// 캐시 키: computeCacheKey(text, voice) — text+voice 해시
// 캐시 경로: tts-cache/{cacheKey}.mp3 (Storage 버킷)

// 흐름
// 1. createServiceClient()로 tts-cache 캐시 존재 확인 (list)
// 2. 있으면 즉시 getPublicUrl() 반환
// 3. 없으면 synthesizeKorean(text, voice) 호출 → mp3 base64 수신
// 4. service-role 클라이언트로 업로드 (upsert: true) 후 공개 URL 반환

// Response
{ audio_url: string, word_timings: WordTiming[] }  // 현재는 항상 []
```

> **service-role 클라이언트 사용 이유:** `tts-cache` 버킷은 `public: true`로 생성돼 있어 *읽기*(공개 URL)는 누구나 가능하지만, `storage.objects` INSERT RLS 정책이 일반 사용자용으로 정의돼 있지 않다. 일반 `createClient()`로 업로드하면 `error`가 반환되지만 기존 코드가 이를 무시해 "성공" 응답에 존재하지 않는 파일의 URL이 담겨 브라우저에서 `NotSupportedError: Failed to load because no supported source was found`가 발생했다. `saveImageBuffer`(story-images, §5.3)와 동일하게 `createServiceClient()`(service-role, RLS 우회)로 전환하고 `uploadError`를 명시적으로 throw하도록 수정 — §1.3의 "RLS silent failure" 주의사항과 동일한 패턴(에러를 던지지 않고 조용히 실패하므로 항상 명시적 에러 체크 필요).

> **버그 이력 (2026-06-08, 3건 모두 수정 완료):**
> 1. `GOOGLE_TTS_API_KEY`가 placeholder 값으로 남아 있어 모든 합성 요청이 실패 → 사용자가 Google Cloud Console에서 Text-to-Speech API용 키 발급 후 `.env.local`에 반영
> 2. `synthesizeKorean`의 요청 바디에 Google TTS REST `v1` `text:synthesize`에 존재하지 않는 `enableTimePointing: ['SSML_MARK']` 필드가 포함돼 있어 모든 요청이 `400 Unknown name "enableTimePointing": Cannot find field`로 실패 → 해당 필드 제거 (`src/lib/tts/google.ts`)
> 3. 위 "service-role 클라이언트 사용 이유" 항목의 업로드 실패 버그

> **TTS 단어 하이라이트 — 미완성 (다음 우선순위):** `synthesizeKorean`은 `data.timepoints ?? []`로 `WordTiming[]`을 추출해 응답에 포함하지만, 현재 일반 텍스트(`input.text`)로 요청하므로 Google TTS가 timepoints를 생성하지 못해 항상 `[]`다. 또한 프론트(`StoryViewer.playTTS`)는 `word_timings`을 아예 사용하지 않는다. 구현하려면 ① SSML `<mark>` 태그 삽입 ② `v1beta1` 엔드포인트로 전환(`v1`은 `enableTimePointing` 미지원) ③ 프론트 하이라이트 렌더링이 모두 필요.

```typescript
// lib/tts/google.ts
export async function synthesizeKorean(text: string, voice: TTSVoice):
  Promise<{ audioBase64: string, wordTimings: WordTiming[] }>

export function computeCacheKey(text: string, voice: TTSVoice): string
```

---

## 3. 컴포넌트 상세 명세

### 3.1 ChunkingStrategyPanel — NEW v2

```typescript
interface ChunkingStrategyPanelProps {
  chunkingType:       'temporal' | 'spatial' | 'mixed'
  presentationMode:   'cumulative' | 'sequential'
  canEdit:            boolean    // role === 'therapist'만 true
  onChange?: (type: ChunkingType, mode: PresentationMode) => void
}
```

**UI 구성:**
```
┌─────────────────────────────────────────┐
│ 📊 청킹 전략 설정  [✏️ 수정 | 🔒 열람]   │
│                                         │
│ 유형  ○ 시간적  ○ 공간적  ● 혼합 ⭐     │
│                                         │
│ 제시  ● 누적 제시 ⭐  ○ 순차 제시       │
│ 방식                                    │
│                                         │
│ 💡 '혼합 + 누적' → 연구기반 최강 조합   │
└─────────────────────────────────────────┘
```

- `canEdit = false` 시: 라디오 버튼 비활성화, 🔒 아이콘 표시
- `canEdit = true` 시: 치료사 수정 가능, ✏️ 아이콘 표시
- 추천 조합(혼합+누적)에 ⭐ 표시 + 추천 문구 항상 표시

### 3.2 CumulativeStrip — NEW v2

```typescript
interface CumulativeStripProps {
  stripText:    string     // AI가 생성한 cumulative_strip_text
  currentPage:  number
  totalPages:   number
  highContrast: boolean
}
```

**UI 구성:**
```
── 지금까지 한 것들 ─────────────────────
✅ 먼저, 급식실 앞에 도착했어요           ← 완료 (흐림, Soft Mint)
✅ 그 다음, 친구들 줄에 섰어요            ← 완료 (흐림, Soft Mint)
▶ 지금, 차례를 기다려요                  ← 현재 (강조, Coral + 테두리)
─────────────────────────────────────────
```

**스타일 규칙:**
- 완료 단계: `text-mint-500 opacity-70` + ✅ 아이콘
- 현재 단계: `text-charcoal font-semibold` + `border-l-2 border-coral-500` + ▶ 아이콘
- 컨테이너: 최대 화면 30%, 스크롤 가능
- `presentation_mode = sequential` 또는 `stripText = null` 시 렌더링 안 함

### 3.3 TrackBadge — NEW v2

```typescript
interface TrackBadgeProps {
  track:    'A' | 'B' | 'C'
  size?:    'sm' | 'md'
}
```

| Track | 아이콘 | 텍스트 | 색상 |
|---|---|---|---|
| A | 🩺 | 치료사 생성 | Lavender |
| B | 👩 | 보호자 생성 | Soft Mint |
| C | 👩‍🏫 | 교사 생성 | Peach Orange |

### 3.4 TherapyGoalTags — NEW v2 (Track A 전용)

```typescript
interface TherapyGoalTagsProps {
  selected:   string[]
  onChange:   (tags: string[]) => void
}

const THERAPY_GOALS = [
  '사회적 의사소통',
  '감정 조절',
  '행동 전환',
  '또래 상호작용',
  '일상 루틴',
]
```

### 3.5 SchoolContextTags — NEW v2 (Track C 전용)

```typescript
interface SchoolContextTagsProps {
  selected:   string[]
  onChange:   (tags: string[]) => void
}

const SCHOOL_CONTEXTS = [
  '수업 참여',
  '급식·쉬는 시간',
  '모둠 활동',
  '학교 행사',
  '교실 규칙',
  '전환 활동',
]
```

### 3.6 ChildSelectorPanel — NEW v2.1

```typescript
interface ChildSelectorPanelProps {
  children:   ChildWithAvatars[]   // Child & { avatars?: Avatar[] }
  selectedId: string | null
  onSelect:   (child: Child) => void
}
```

**UI 구성:**
- 모바일 (`md:hidden`): 상단 수평 스크롤 카드 — 아바타 이미지 + 이름 + 연령대 라벨
- PC (`hidden md:flex`): 좌측 세로 패널 (w-44) — 아이별 선택 버튼
- 선택됨: `bg-mint-100 ring-2 ring-mint-400`
- 미선택: `bg-white border border-gray-100`
- 아바타 이미지 없을 경우: 🧒 이모지 플레이스홀더

**연령대 라벨 매핑:**
```typescript
const AGE_GROUP_LABEL = {
  '5-6':   '미취학',
  '7-9':   '초(저학년)',
  '10-12': '초(고학년)',
  '13-15': '중학생',
  '16-18': '고등학생',
}
```

**사용 조건:** `children.length > 1`일 때만 렌더링 (아이가 1명이면 자동 선택)

---

### 3.7 StoryViewer — v2 변경

```typescript
interface StoryViewerProps {
  pages:              StoryPage[]
  presentationMode:   'cumulative' | 'sequential'   // NEW v2
  track:              'A' | 'B' | 'C'               // NEW v2
  mode?:              ViewerMode
  voice?:             TTSVoice
  highContrast?:      boolean
}
```

**변경 사항:**
- `presentationMode = 'cumulative'` 시 각 페이지 하단에 `<CumulativeStrip>` 렌더링
- 뷰어 상단에 `<TrackBadge>` 표시
- Track C 스토리 + `home_connection_memo` 있을 경우 마지막 페이지 하단에 "📝 가정 연계 메모" 섹션 표시

---

### 3.8 ObservationForm — NEW v2.3 (치료사 전용)

```typescript
interface ObservationFormProps {
  childId:     string
  initialData?: Partial<BehaviorObservation>
  onSaved:     (observation: BehaviorObservation) => void
  onLinkStory: (observationId: string) => void  // Track A 연결 버튼
}
```

**UI 구성:**
- 아동 선택 드롭다운 (ChildSelectorPanel 활용)
- 관찰 일시 DateTimePicker + 환경 라디오 (클리닉/학교/가정)
- A/B/C 텍스트에어리어 (각 최소 3줄, 레이블 + 예시 힌트)
- 대체행동 목표 텍스트에어리어 (선택)
- 하단 액션: `[기록 저장]` + `[AI로 행동 기능 분석하기]`
- 저장 후 `[이 관찰로 Track A 스토리 만들기]` StoryLinkButton 표시

---

### 3.9 SeatSelector — NEW v2.3

```typescript
interface SeatSelectorProps {
  value:      ('S' | 'E' | 'A' | 'T')[]
  onChange:   (value: ('S' | 'E' | 'A' | 'T')[]) => void
  aiResult?:  { seat_function: string[], rationale: string }  // AI 분석 결과
  loading?:   boolean
}
```

**UI 구성 (4개 카드 그리드):**
```
[S 감각 자기자극 ✓]  [E 도피·회피     ]
[A 관심 요청     ]   [T 유형적 요구   ]
```
- 복수 선택 가능, 선택 시 Lavender 배경
- AI 분석 결과 있을 시: 추천 항목 `⭐` 표시 + rationale 툴팁

---

### 3.10 ObservationHistory — NEW v2.3

```typescript
interface ObservationHistoryProps {
  childId:   string
  onSelect?: (observation: BehaviorObservation) => void
}
```

**UI 구성 (시계열 카드 목록):**
- 관찰 일시 (날짜 + 환경 배지)
- B 행동 텍스트 첫 줄 미리보기
- SEAT 분류 태그 (`S`, `E`, `A`, `T` 색상 배지)
- 연결된 스토리 있을 시: "📖 스토리 연결됨" 링크 배지
- 무한 스크롤 (페이지당 20건)

---

### 3.11 StoryLinkButton — NEW v2.3

```typescript
interface StoryLinkButtonProps {
  observationId: string
  onLink:        () => void
}
```

**UI:** `[🔗 이 관찰로 Track A 스토리 만들기]`
- Lavender 배경 버튼
- 클릭 시 GET `/api/observations/[id]/story-input` 호출
- 결과를 Track A 생성 페이지 state에 주입 후 `/story/create/therapist`로 이동

---

### 3.12 EditableStoryTitle — NEW v2.3

```typescript
interface EditableStoryTitleProps {
  storyId:  string
  title:    string
  editable: boolean   // story.creator_id === user.id 일 때만 true
}
```

**UI 구성:**
- `editable = false`: 정적 `<h1>{title}</h1>`만 렌더링
- `editable = true`, 비편집 상태: `<h1>` 옆 호버 시 연필 아이콘 버튼 노출
- 편집 상태: 인라인 `<input>` + ✓(저장)/✕(취소) 버튼
- 저장: `PATCH /api/story/{storyId}` `{ title }` 호출 → 성공 시 `router.refresh()`
- 빈 문자열 저장 방지(서버 측 400과 동일한 클라이언트 측 가드)

> **연계:** `/story/[id]` 상세 페이지에서 `isCreator = story.creator_id === user.id`로 판별해 `editable` prop 전달. 본문(페이지) 직접 수정 화면은 없음 — 본문 변경은 자문 댓글·수정 제안 플로우로만 반영(§5.4 of HLD v2.3).

### 3.13 DeleteStoryButton — v2.3 (노출 조건 확장)

```typescript
interface DeleteStoryButtonProps {
  storyId: string
}
```

**UI 구성:**
- 클릭 → 바텀 시트 확인 모달 → `DELETE /api/story/{storyId}` 호출 → 성공 시 `/dashboard`로 리다이렉트
- **노출 조건 (v2.3 변경):** `isParent || isCreator` (기존엔 `isParent`만 — 치료사·교사가 만든 스토리는 삭제 버튼 자체가 없었음)
- `isParent` 판별 시 주의: Supabase join 결과는 `story.children`로 반환되므로 `story.child`로 접근하면 항상 `undefined`가 되어 `isParent`가 거짓이 되는 버그가 있었음(2026-06-07 수정)

### 3.14 BookshelfClient — v2.3 → v2.6 업데이트 ("브릿지 책장")

```typescript
interface BookshelfClientProps {
  stories: (Story & {
    children: { name: string; age_group: AgeGroup } | null
    story_pages: { image_url: string | null; page_number: number }[]
  })[]
  userRole?: UserRole | null  // v2.6 추가: child 모드 분기에 사용
}
```

**UI 구성:**
- 트랙 필터 칩: 전체 / 🩺치료사 / 👩보호자 / 👩‍🏫교사 (`useState<Track | 'all'>`)
- 카드 그리드: 표지 이미지(첫 페이지) · 제목 · `<TrackBadge>` · 아동명 · 페이지 수 · 작성일(상대 표기)
- 빈 상태: "아직 만든 스토리가 없어요" / 필터 결과 없음 메시지 분리
- 서버 컴포넌트(`/bookshelf/page.tsx`)에서 `stories.select('*, children(name, age_group), story_pages(image_url, page_number)')`를 **앱 레벨 필터 없이** RLS만으로 조회 → 본인 소유 + 그룹으로 연결된 스토리가 자동으로 모두 포함됨, `updated_at desc` 정렬

**v2.6 child 모드 추가:**
- 서버 컴포넌트에서 `user_profiles.role`을 `Promise.all`로 병렬 조회해 `userRole` prop 전달
- `isChild = userRole === 'child'` 플래그로 분기:
  - 빈 상태 시: "스토리 만들기" CTA 버튼 숨김 → 대신 "초대 코드를 입력하면 내 이야기가 여기에 나타나요" 안내
  - 스토리 목록 상단: `<ChildConnectForm />` 항상 표시
  - 부제목: "나를 위해 만들어진 이야기를 읽어보세요" (일반 사용자와 다른 문구)

### 3.15 ChildConnectForm — NEW v2.6 (BookshelfClient 내부 컴포넌트)

```typescript
// BookshelfClient.tsx 내부에 선언된 클라이언트 컴포넌트
function ChildConnectForm() {
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const join = async () => {
    const res = await fetch('/api/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg('연결됐어요! 이제 내 이야기를 볼 수 있어요 🎉')
      window.location.reload()  // 스토리 목록 새로고침
    } else {
      setMsg(data.error ?? '연결에 실패했어요. 코드를 다시 확인해 주세요.')
    }
  }
}
```

**POST /api/group 변경사항 (v2.6):**
- 기존: `if (!profile || profile.role === 'parent') → 403` (보호자·없는 유저 차단)
- 변경: child를 포함한 나머지 역할(therapist, teacher, child)은 모두 초대 코드 참여 허용
- child는 협업 공간(`/collab`)에 접근할 수 없으므로 BookshelfClient에 별도 UI 제공

### 3.16 미들웨어 child 보호 로직 — NEW v2.6

```typescript
// src/lib/supabase/middleware.ts

// 로그인 직후 리다이렉트
if (user && isAuthRoute) {
  const role = user.user_metadata?.role as string | undefined
  url.pathname = role === 'child' ? '/bookshelf' : '/dashboard'
  return NextResponse.redirect(url)
}

// child 역할: 허용 경로 외 모두 /bookshelf로 차단
if (user && !isApiRoute) {
  const role = user.user_metadata?.role as string | undefined
  const CHILD_ALLOWED = ['/bookshelf', '/settings', '/story']  // /story는 읽기 전용
  const CHILD_BLOCKED = ['/story/create']                       // 생성 페이지만 명시적 차단
  if (
    role === 'child' &&
    (!CHILD_ALLOWED.some(p => pathname.startsWith(p)) ||
      CHILD_BLOCKED.some(p => pathname.startsWith(p)))
  ) {
    url.pathname = '/bookshelf'
    return NextResponse.redirect(url)
  }
}
```

### 3.17 SideBar/BottomNavBar child 필터링 — NEW v2.6

```typescript
// SideBar.tsx
const CHILD_NAV_HREFS = ['/bookshelf', '/settings']
// render:
{(role === 'child'
  ? navItems.filter(i => CHILD_NAV_HREFS.includes(i.href))
  : navItems
).map(item => <NavItem key={item.href} {...item} />)}

// BottomNavBar.tsx
export function BottomNavBar({ role }: { role?: UserRole | null }) {
  const visibleItems = role === 'child'
    ? navItems.filter(i => CHILD_NAV_HREFS.includes(i.href))
    : navItems
}
// MainLayout에서 <BottomNavBar role={role} /> 전달
```

---

## 4. 상태 관리 설계 (Zustand)

### 4.1 story.store.ts — v2 변경

```typescript
interface StoryStore {
  // 기존 유지
  stories:              Story[]
  currentStory:         Story | null
  currentPages:         StoryPage[]
  isGenerating:         boolean
  generationProgress:   number
  streamedPages:        Partial<StoryPage>[]
  clarifyingQuestions:  string[]

  // v2 신규
  selectedTrack:        'A' | 'B' | 'C' | null
  chunkingType:         ChunkingType
  presentationMode:     PresentationMode
  therapyGoalTags:      string[]
  schoolContextTags:    string[]
  homeConnectionMemo:   string

  // 액션
  setSelectedTrack:     (track: 'A' | 'B' | 'C') => void
  setChunkingType:      (type: ChunkingType) => void
  setPresentationMode:  (mode: PresentationMode) => void
  updateChunking:       (storyId: string, type: ChunkingType, mode: PresentationMode) => Promise<void>
  generateStory:        (input: GenerateStoryInput) => Promise<void>
  resetGeneration:      () => void
}
```

---

## 5. AI 프롬프트 템플릿

### 5.1 Track별 시스템 프롬프트 (공통 + 특화)

```typescript
// lib/prompts/story-generation.ts

export function buildTrackSystemPrompt(
  child: Child,
  chunkingType: ChunkingType,
  presentationMode: PresentationMode,
  track: 'A' | 'B' | 'C',
  options: {
    therapyGoalTags?: string[]
    schoolContextTags?: string[]
    homeConnectionMemo?: string
  }
): string {

  const base = `당신은 ASD(자폐 스펙트럼 장애) 아동을 위한 소셜 스토리 전문 작가입니다.
Carol Gray Social Stories™ 10.4 기준을 엄격히 준수하세요.

## 필수 규칙
1. 문장 비율: 설명문+조망문 ≥ 지시문의 4배
2. 긍정·칭찬 문장: 전체의 최소 50%
3. 어조: 따뜻하고 인내심 있는 톤, 부정적 표현 금지
4. 페이지 구성: 도입(intro) 1p + 본문(body) 최대 8p + 결론(conclusion) 1p

## 아동 정보
이름: ${child.name}, 나이: ${getAge(child)}세 (${child.age_group})
관심사: ${child.interests.join(', ')}
친숙한 환경: ${child.familiar_envs.join(', ')}`

  const chunkingInstruction = buildChunkingInstruction(chunkingType, presentationMode)

  const trackInstruction = {
    A: `
## Track A — 치료사 주도 (임상 맥락)
치료 목표 태그: [${options.therapyGoalTags?.join(', ') ?? '없음'}]
- 치료 목표 태그와 직접 연결된 지시문(Coaching)을 명확히 작성하세요.
- Carol Gray 8th 기준(서술 우선·코칭 최소화)을 준수하되, 목표 행동 지시문은 구체적으로 작성하세요.`,

    B: `
## Track B — 보호자 주도 (일상 맥락)
- 전문 용어를 사용하지 말고 아동·가족 친화적 언어로 작성하세요.
- 일상적이고 따뜻한 어조를 유지하세요.`,

    C: `
## Track C — 교사 주도 (학교 맥락)
학교 맥락 태그: [${options.schoolContextTags?.join(', ') ?? '없음'}]
- 또래 상호작용과 교실·학교 환경을 중심으로 묘사하세요.
${options.homeConnectionMemo ? `- 가정 연계 메모: "${options.homeConnectionMemo}" (마지막 페이지에 반영)` : ''}`,
  }[track]

  const outputFormat = buildOutputFormat(presentationMode)

  return `${base}\n${chunkingInstruction}\n${trackInstruction}\n${outputFormat}`
}

function buildChunkingInstruction(type: ChunkingType, mode: PresentationMode): string {
  const typeInstr = {
    temporal: "각 본문 페이지를 '먼저', '그 다음', '마지막으로' 시간 표지어로 시작하세요.",
    spatial:  "각 본문 페이지를 '[장소]에서,' 공간 맥락 표지어로 시작하세요.",
    mixed:    "각 본문 페이지를 '[장소]에서, [먼저/그 다음/마지막으로]' 시간+공간 표지어를 함께 사용하세요. (연구기반 최강 조합)",
  }[type]

  const modeInstr = mode === 'cumulative'
    ? `각 페이지마다 cumulative_strip_text 필드를 생성하세요.
       완료 단계는 "✅ [표지어], [행동]" 형식, 현재 단계는 "▶ 지금, [행동]" 형식으로 작성하세요.
       미래 단계는 포함하지 마세요. 최대 3줄.`
    : 'cumulative_strip_text는 null로 설정하세요.'

  return `## 청킹 전략\n${typeInstr}\n\n## 제시 방식\n${modeInstr}`
}

function buildOutputFormat(mode: PresentationMode): string {
  return `
## 출력 형식 (JSON 배열만 반환, 다른 텍스트 없음)
[
  {
    "page_number": 1,
    "page_type": "intro",
    "chunking_label": null,
    "descriptive": "설명문",
    "perspective": "조망문 또는 null",
    "coaching": null,
    "image_prompt": "Replicate FLUX용 영문 프롬프트 (장면 묘사 — 캐릭터 일관성 합성은 §5.3에서 별도 처리)",
    "cumulative_strip_text": ${mode === 'cumulative' ? '"누적 스트립 텍스트 또는 null"' : 'null'}
  }
]`
}
```

### 5.2 스토리 제목 자동 생성 프롬프트 — v2.3 (문장형 요약으로 재작성)

```typescript
// lib/openai/story.ts — generateStoryTitle(sixWh, child, chunkingType)
// 모델: gpt-4o-mini, 응답: { "title": "제목" } (json_object 강제)

const systemPrompt = `당신은 ASD 아동용 소셜 스토리 제목을 작성하는 전문가입니다.
6WH 정보를 바탕으로 스토리의 상황과 배울 점이 자연스럽게 드러나는 문장형 제목을 작성하세요.
규칙: 한국어, 15~25자 내외의 완결된 문장 또는 구절, 아동의 이름을 자연스럽게 포함, 구체적인 상황·행동이 드러나도록 작성.
예시: "민준이의 급식 줄 서기 연습 이야기", "태인이와 함께하는 버스 타는 날", "쉬는 시간에 친구에게 먼저 인사하기"
JSON 형식으로만 응답: {"title": "제목"}`

// user 메시지: 아동 이름·나이, 청킹 유형, 6WH(who/where/what/how/why)
// 반환: parsed.title ?? `${child.name}의 이야기` (실패 시 폴백, prefix 없음)
```

> **변경 이력 (2026-06-08):** 기존엔 `[아이이름(나이)/청킹유형] 10자 이내 키워드형` 형식(예: `[민준(7)/혼합] 급식 줄 서기`)이었으나, 사용자가 "내용의 문맥에 맞게 요약해서 보여주는 더 긴 문장형 요약 제목"을 명시적으로 선택(AskUserQuestion)해 대괄호 메타정보 prefix를 제거하고 15~25자 문장형으로 전면 재작성. `generateStoryStream()`과 `Promise.all()`로 병렬 실행되어 추가 지연이 없으며, 생성 후에도 creator는 `EditableStoryTitle`(§3.12)로 인라인 재수정 가능.

### 5.3 페이지 일러스트 생성 함수 — generateStoryPageImage (Replicate 전환 + 아바타 일관성, NEW v2.5)

```typescript
// lib/openai/avatar.ts
export async function generateStoryPageImage(
  imagePrompt: string,
  avatarStyle?: AvatarStyle,
  avatarImageUrl?: string | null,        // ★ NEW v2.5 — 아동 기본 아바타 이미지 URL
): Promise<{ buffer: ArrayBuffer; contentType: string }>   // contentType은 saveImageBuffer가 PNG/JPEG 확장자 결정에 사용
```

**분기 로직 (avatarImageUrl 유무):**

| 조건 | 모델 | 방식 |
|---|---|---|
| `avatarImageUrl` 있음 | `black-forest-labs/flux-kontext-pro` | 이미지 조건부 편집 — `input_image: avatarImageUrl` + 프롬프트 `"Place this exact same character into a new scene: ${imagePrompt}. ${stylePrefix}children's picture book illustration, keep the same face, hairstyle and outfit as the reference image, ..."` → 결과를 `FileOutput`으로 캐스팅 후 `.blob()`/`.url()`로 버퍼 추출 |
| `avatarImageUrl` 없음 (폴백) | `black-forest-labs/flux-schnell` | 기존 텍스트→이미지 생성 (장당 ~$0.003, ~0.6초, `FileOutput[]` 반환) |

**호출 위치:** `src/app/api/story/generate/route.ts`
```typescript
const avatarImageUrl = defaultAvatar?.image_url ?? null
// ... 페이지 루프 내부 (순차 처리, for...await — 병렬 아님)
const { buffer, contentType } = await generateStoryPageImage(page.image_prompt, avatarStyle, avatarImageUrl)
imageUrl = await saveImageBuffer(buffer, contentType, story.id, index + 1)
// saveImageBuffer는 contentType으로 jpg/png 확장자를 결정해 저장 (FLUX는 PNG 고정 출력이지만, 과거 Pollinations 시절 혼합 응답 대응 로직이 유지됨)
```

> **변경 이력 (2026-06-08, Pollinations.ai → Replicate 전면 전환):** Pollinations.ai가 x402 결제 프로토콜을 도입하며 `Queue full for IP` 402 에러가 상시 발생해 사용 불가 판정 → `black-forest-labs/flux-schnell`(텍스트→이미지)로 전환. 이어서 사용자가 "등록된 아이 프로필로 이미지를 생성해줬으면 좋겠어"를 요청해, 아동의 기본 아바타가 등록돼 있으면 `flux-kontext-pro`(이미지 조건부 편집 모델)로 "동일 캐릭터를 새 장면에 배치" 프롬프트를 사용하도록 확장 — 페이지마다 얼굴·헤어·옷차림이 일관되게 유지된다. 아바타가 없는 아동은 기존 FLUX Schnell 텍스트 생성으로 자동 폴백. 실제 생성 결과를 검증해 워터컬러 스타일 아바타의 얼굴/헤어/의상이 새 장면에서도 그대로 유지됨을 확인했다.

> **참고 — 순차 처리 (병렬 아님):** 페이지 이미지는 `for...await` 루프로 한 장씩 순차 생성된다. HLD §3.1에서 과거 "병렬"로 잘못 기술돼 있던 부분을 실제 코드에 맞춰 정정했다(HLD v2.4).

---

## 6. 파일 구조

```
storybridge/src/
├── app/
│   ├── (main)/
│   │   ├── story/
│   │   │   ├── create/
│   │   │   │   ├── page.tsx             ← Track 선택 (역할 기반 자동 분기)
│   │   │   │   ├── therapist/page.tsx   ← NEW v2: Track A
│   │   │   │   ├── parent/page.tsx      ← NEW v2: Track B
│   │   │   │   ├── teacher/page.tsx     ← NEW v2: Track C
│   │   │   │   └── pool/page.tsx        ← 유지
│   │   │   └── [id]/
│   │   │       ├── page.tsx             ← v2.3: EditableStoryTitle + isCreator 분기, 죽은 "편집" 링크 제거
│   │   │       └── view/page.tsx        ← CumulativeStrip + Track 메타 표시
│   │   ├── 🆕 bookshelf/                ← NEW v2.3: "브릿지 책장 (내 이야기)"
│   │   │   ├── page.tsx                ← 서버 컴포넌트, RLS-only 전체 스토리 조회
│   │   │   └── BookshelfClient.tsx     ← 트랙 필터 칩 + 카드 그리드
│   │   ├── profile/page.tsx             ← NEW v2.1: 아동 프로필 관리
│   │   │   └── ProfileClient.tsx
│   │   ├── avatar-studio/page.tsx       ← NEW v2.1: 아바타 스튜디오
│   │   │   └── AvatarStudioClient.tsx
│   │   ├── onboarding/child/page.tsx    ← NEW v2.1: 아동 프로필 등록
│   │   ├── observations/               ← NEW v2.3: 행동 관찰하기 (모든 역할 작성 가능 — migration 007)
│   │   │   ├── page.tsx                ← ObservationHistory + 새 기록 버튼
│   │   │   ├── new/page.tsx            ← ObservationForm (신규 입력)
│   │   │   └── [id]/page.tsx           ← 관찰 상세 + SeatSelector + StoryLinkButton
│   │   ├── dashboard/page.tsx          ← v2.3: "전체 보기" 링크를 죽은 /story → /bookshelf로 수정
│   │   └── layout.tsx                  ← v2.1: user_metadata.role → SideBar prop
│   │
│   └── api/
│       ├── story/
│       │   ├── generate/route.ts        ← v2.3: track/created_by_role 등 누락 필드 INSERT 보강 (TRACK_META로 derive)
│       │   ├── [id]/
│       │   │   ├── route.ts             ← v2.3: PATCH(title만, creator 검증) + DELETE(parent OR creator) 재작성
│       │   │   └── chunking/route.ts    ← NEW v2: 청킹 전략 수정 (치료사 전용, 미구현)
│       │   └── pool/route.ts            ← Story Pool API
│       └── observations/
│           └── [id]/story-input/route.ts ← v2.3: raw_input을 ABC 4-섹션 순서로 재구성, recorder_id 필터 제거
│
├── components/
│   ├── story/
│   │   ├── ChunkingStrategyPanel.tsx    ← NEW v2 ✅
│   │   ├── CumulativeStrip.tsx          ← NEW v2 ✅
│   │   ├── TrackBadge.tsx               ← NEW v2 ✅
│   │   ├── TherapyGoalTags.tsx          ← NEW v2 ✅ (Track A)
│   │   ├── SchoolContextTags.tsx        ← NEW v2 ✅ (Track C)
│   │   ├── ChildSelectorPanel.tsx       ← NEW v2.1 ✅ (아이 선택 패널)
│   │   ├── EditableStoryTitle.tsx       ← NEW v2.3 ✅ (제목 인라인 수정, creator 전용)
│   │   ├── DeleteStoryButton.tsx        ← v2.3 ✅ (노출 조건 isParent || isCreator로 확장)
│   │   ├── SixWHGuide.tsx               ← 유지 ✅
│   │   ├── ChunkingSelector.tsx         ← 구형 잔존 (통합 예정)
│   │   └── StoryViewer.tsx              ← v2 수정 ✅ (CumulativeStrip + TrackBadge)
│   └── layout/
│       ├── SideBar.tsx                  ← v2.3: "브릿지 책장"(BookOpen) 메뉴 추가
│       └── BottomNavBar.tsx             ← v2.3: "책장"(BookOpen) 메뉴 추가
│
├── stores/
│   ├── story.store.ts                   ← v2 부분 구현 (Track 파라미터 완성 예정)
│   ├── child.store.ts                   ← NEW v2.1 ✅
│   └── auth.store.ts / ui.store.ts / collab.store.ts
│
├── types/
│   └── app.types.ts                     ← v2.1 완성 (5구간, Track, Chunking 상수) + observation_id(v3.2)
│
└── lib/
    ├── openai/
    │   ├── story.ts                     ← Track별 프롬프트 분기; v2.3: generateStoryTitle() 문장형 요약으로 재작성
    │   └── avatar.ts                    ← v2.5: generateStoryPageImage() — Replicate FLUX 전환 + 아바타 일관성 분기 (§5.3)
    ├── prompts/
    │   └── story-generation.ts          ← buildTrackSystemPrompt 추가
    └── tts/
        └── google.ts                    ← NEW v2.5: synthesizeKorean(), computeCacheKey() — enableTimePointing 필드 제거 (§2.6)
```

```
└── app/api/
    └── tts/route.ts                     ← NEW v2.5: GET /api/tts — service-role 캐시·합성 (§2.6)
```

---

## 7. TypeScript 타입 정의

```typescript
// types/app.types.ts — v2.1 최신 (실제 코드 기준)

// ── 기본 타입 ────────────────────────────────────────────────

export type UserRole = 'parent' | 'therapist' | 'teacher' | 'child'
// ↑ v2.6: 'child' 추가 (migration 014과 함께 적용)
export type AvatarStyle = 'ghibli' | 'realistic' | 'pixar' | 'watercolor'
export type AgeGroup = '5-6' | '7-9' | '10-12' | '13-15' | '16-18'
// v2.1: 3구간 → 5구간 (미취학 추가, 10~12/13~15/16~18 분리)
export type StorySource = 'ai' | 'pool' | 'manual'
export type StoryStatus = 'draft' | 'published' | 'archived'
export type PageType = 'intro' | 'body' | 'conclusion'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type ViewerMode = 'manual' | 'autoplay' | 'slideshow'
export type TTSVoice = 'male' | 'female' | 'child'

// ── v2 신규 타입 ─────────────────────────────────────────────

export type Track = 'A' | 'B' | 'C'
export type ChunkingType = 'temporal' | 'spatial' | 'mixed'
export type PresentationMode = 'cumulative' | 'sequential'

// ── Story 인터페이스 v2 확장 ────────────────────────────────

export interface Story {
  id:                   string
  child_id:             string
  creator_id:           string
  title:                string

  // v2 신규
  track:                Track
  created_by_role:      UserRole
  chunking_type:        ChunkingType
  presentation_mode:    PresentationMode
  therapy_goal_tags:    string[]
  school_context_tags:  string[]
  home_connection_memo: string | null

  // 기존 유지
  source:               StorySource
  pool_template_id?:    string
  status:               StoryStatus
  raw_input?:           string
  six_wh?:              SixWH
  page_count:           number
  observation_id?:      string | null   // v3.2 신규: ABC 관찰 연결 FK
  created_at:           string
  updated_at:           string
  child?:               Child
}
```

> **`child` vs `children` 조인 네이밍 주의:** 타입 선언은 `child?: Child`이지만 Supabase의 `select('*, children(...)')` 조인은 테이블명을 그대로 키로 사용해 **`children`**으로 반환된다. `story.child`로 접근하면 항상 `undefined`가 되어 `isParent` 같은 판별 로직이 항상 거짓으로 평가되는 버그가 있었다(2026-06-07 수정 — `/story/[id]` 등에서 `story.children`로 접근하도록 변경). 타입을 고치는 대신 호출부를 실제 조인 결과에 맞춰 수정했다.

```typescript

// ── StoryPage 인터페이스 v2 확장 ────────────────────────────

export interface StoryPage {
  id:                   string
  story_id:             string
  page_number:          number
  page_type:            PageType
  image_url?:           string
  image_prompt?:        string
  descriptive?:         string
  perspective?:         string
  coaching?:            string
  chunking_label?:      string
  cumulative_strip_text?: string   // NEW v2: 누적 제시 스트립 텍스트
  tts_url?:             string
  created_at:           string
  updated_at:           string
}

// ── GenerateStoryInput v2 확장 ──────────────────────────────

export interface GenerateStoryInput {
  child_id:                 string
  raw_input:                string

  // v2 신규
  track:                    Track
  chunking_type:            ChunkingType
  presentation_mode:        PresentationMode
  therapy_goal_tags?:       string[]
  school_context_tags?:     string[]
  home_connection_memo?:    string
  request_therapist_review?: boolean
  observation_id?:          string   // v3.2 신규: ABC 관찰 연결 (story-input 응답에서 전달)

  avatar_id?:               string
}

// ── ChunkingConfig ───────────────────────────────────────────

export interface ChunkingConfig {
  chunking_type:      ChunkingType
  presentation_mode:  PresentationMode
  can_edit:           boolean  // role === 'therapist'
}

// ── Track 메타 상수 ──────────────────────────────────────────

export const TRACK_META: Record<Track, {
  label: string
  emoji: string
  role: UserRole
  color: string
  bgClass: string
}> = {
  A: { label: '치료사 생성', emoji: '🩺', role: 'therapist', color: '#C9B8E8', bgClass: 'bg-lavender-100' },
  B: { label: '보호자 생성', emoji: '👩', role: 'parent',    color: '#A8D8D8', bgClass: 'bg-mint-100' },
  C: { label: '교사 생성',   emoji: '👩‍🏫', role: 'teacher',   color: '#F5C5A3', bgClass: 'bg-orange-100' },
}

export const AGE_GROUP_META: Record<AgeGroup, { label: string; desc: string }> = {
  '5-6':   { label: '미취학',      desc: '만 5~6세' },
  '7-9':   { label: '초(저학년)', desc: '만 7~9세' },
  '10-12': { label: '초(고학년)', desc: '만 10~12세' },
  '13-15': { label: '중학생',      desc: '만 13~15세' },
  '16-18': { label: '고등학생',    desc: '만 16~18세' },
}

export function calcAgeGroup(birthYear: number): AgeGroup {
  const age = new Date().getFullYear() - birthYear
  if (age <= 6)  return '5-6'
  if (age <= 9)  return '7-9'
  if (age <= 12) return '10-12'
  if (age <= 15) return '13-15'
  return '16-18'
}

export const CHUNKING_DEFAULTS: ChunkingConfig = {
  chunking_type:     'mixed',
  presentation_mode: 'cumulative',
  can_edit:          false,
}

export const THERAPY_GOAL_OPTIONS = [
  '사회적 의사소통',
  '감정 조절',
  '행동 전환',
  '또래 상호작용',
  '일상 루틴',
] as const

export const SCHOOL_CONTEXT_OPTIONS = [
  '수업 참여',
  '급식·쉬는 시간',
  '모둠 활동',
  '학교 행사',
  '교실 규칙',
  '전환 활동',
] as const
```

---

## 8. 환경 변수 명세

```bash
# .env.local

NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Admin API + 청킹 권한 검증 + story-images/tts-cache 업로드(RLS 우회)

OPENAI_API_KEY=sk-proj-...         # 스토리 본문/제목/SEAT 분석 (gpt-4o, gpt-4o-mini) — 이미지 생성에는 더 이상 사용 안 함
REPLICATE_API_KEY=r8_...           # ★ NEW v2.5 — 이미지 생성 (flux-schnell / flux-kontext-pro / face-to-many 등)
GOOGLE_TTS_API_KEY=AIzaSy...       # v2.5: placeholder → 실제 키로 교체 완료 (TTS 정상화 1단계)

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## v1.0 → v2.0 변경 요약

| 섹션 | 변경 내용 |
|---|---|
| §1 DB 스키마 | `stories`에 `track`, `created_by_role`, `chunking_type`, `presentation_mode`, `therapy_goal_tags`, `school_context_tags`, `home_connection_memo` 추가; `story_pages`에 `cumulative_strip_text` 추가; `approvals`에 `track` 추가; 청킹 수정 RLS 정책 추가 |
| §2 API | `/api/story/generate` Track 파라미터 확장; `/api/story/[id]/chunking` 신규 (치료사 전용); `/api/story/[id]/notify` 신규 (Track별 알림) |
| §3 컴포넌트 | `ChunkingStrategyPanel`, `CumulativeStrip`, `TrackBadge`, `TherapyGoalTags`, `SchoolContextTags` 신규; `StoryViewer` v2 수정 |
| §4 상태관리 | `story.store.ts`에 Track, 청킹 상태 추가 |
| §5 프롬프트 | `buildTrackSystemPrompt` 함수 추가 (Track별 분기 + 청킹 파라미터 통합) |
| §6 파일구조 | Track별 생성 페이지 3개 추가; 신규 컴포넌트 파일 추가 |
| §7 타입 | `Track`, `ChunkingType`, `PresentationMode` 신규; `Story`, `StoryPage`, `GenerateStoryInput` v2 확장 |

---

## v2.0 → v2.1 변경 요약 (2026.06.06)

| 섹션 | 변경 내용 |
|---|---|
| §1.2 DB children | age_group 3구간 → 5구간 (`'5-6','7-9','10-12','13-15','16-18'`) |
| §1.6 마이그레이션 | migration 004 실행 완료; migration 005(stories DELETE RLS 정책) 추가 및 실행 완료 (2026-06-07) |
| §3 컴포넌트 | ChildSelectorPanel 명세 신규 추가 |
| §6 파일구조 | /profile, /avatar-studio, /onboarding/child 페이지 추가; child.store.ts 추가; SideBar v2.1 명시 |
| §7 타입 | AgeGroup 5구간 업데이트; TRACK_META bgClass 추가; AGE_GROUP_META, calcAgeGroup() 추가 |

---

## v2.1 → v2.3 변경 요약 (2026.06.08)

| 섹션 | 변경 내용 |
|---|---|
| §1.6 마이그레이션 | migration 006 추가 (behavior_observations 테이블 + RLS; stories.observation_id FK) |
| §1.8 DB 스키마 | behavior_observations 테이블 DDL 신규 추가 |
| §2.5 API | /api/observations CRUD 5개 엔드포인트 명세 신규 |
| §3.8~3.11 컴포넌트 | ObservationForm, SeatSelector, ObservationHistory, StoryLinkButton 명세 신규 |
| §6 파일구조 | /observations, /observations/new, /observations/[id] 페이지 추가 |

---

## v2.3 → v2.4 변경 요약 (2026.06.08)

| 섹션 | 변경 내용 |
|---|---|
| §1.3 DB stories | `observation_id` FK 컬럼 DDL에 명시; v2.3 신규 DELETE 정책(005+013, creator 조건) 추가; RLS silent failure 주의 블록quote 추가 |
| §1.6 마이그레이션 | 007(recorder_id/recorder_role 일반화), 008(공유 조회·치료사 보강 권한), 009~012(groups RLS 시행착오 → 최종 v3), 013(stories DELETE creator 조건, 실행 대기) 행 추가 |
| §1.8 behavior_observations | 최초 설계(006, 치료사 전용)에서 007/008로 모든 역할 작성·그룹 공유 조회·치료사 타인 기록 보강이 가능하도록 확장된 최종 RLS로 전면 갱신 |
| §2.1 generate API | `GenerateStoryRequest`에 `observation_id` 추가; INSERT 필드 누락 버그(track/created_by_role 등 7개 필드, `TRACK_META[track].role`로 derive) 이력 명시 |
| §2.4 신규 | PATCH `/api/story/[id]`(title만, creator 검증 — 보안 구멍 수정 이력) / DELETE `/api/story/[id]`(parent OR creator, RLS 013 동기화 필요성) 명세 신규 |
| §2.5 story-input | 응답 형식을 실제 구현(raw_input ABC 4-섹션 bracket 포맷, recorder_id 필터 제거)에 맞게 재작성 |
| §3.12~3.14 컴포넌트 | EditableStoryTitle, DeleteStoryButton(노출 조건 확장), BookshelfClient 명세 신규 |
| §5.2 신규 | AI 제목 자동 생성 프롬프트(문장형 15~25자, 병렬 실행, 인라인 재수정 연계) 명세 신규 |
| §6 파일구조 | `/bookshelf` 라우트, EditableStoryTitle/DeleteStoryButton, story-input 변경, generate/route.ts 및 story/[id]/route.ts 수정 사항 반영 |
| §7 타입 | `Story`/`GenerateStoryInput`에 `observation_id` 추가; `child` vs `children` 조인 네이밍 불일치 주의사항 추가 |

---

## v2.4 → v2.5 변경 요약 (2026.06.08)

| 섹션 | 변경 내용 |
|---|---|
| §2.6 신규 | 음성 안내(TTS) API — `GET /api/tts` 명세 신규 추가: 캐시 키/경로, service-role 클라이언트 사용 이유, 버그 이력 3건(placeholder 키 / `enableTimePointing` 필드 오류 / storage RLS 누락으로 인한 silent upload 실패), 단어 하이라이트 미완성 상태 명시 |
| §5.1 image_prompt | "DALL·E 3용 영문 프롬프트" 주석을 "Replicate FLUX용 영문 프롬프트"로 정정 |
| §5.3 신규 | `generateStoryPageImage()` 함수 명세 신규 추가 — Pollinations.ai → Replicate 전환 배경(x402 결제 프로토콜로 서비스 중단), `flux-schnell`(텍스트→이미지)/`flux-kontext-pro`(아바타 조건부 편집) 분기 로직, 호출부(`generate/route.ts`) 코드, 순차 처리(병렬 아님) 명시 |
| §6 파일구조 | `lib/openai/avatar.ts`, `lib/tts/google.ts`, `app/api/tts/route.ts` 추가 |
| §8 환경 변수 | `REPLICATE_API_KEY` 신규 추가; `OPENAI_API_KEY`(이미지 생성에 더 이상 미사용) / `SUPABASE_SERVICE_ROLE_KEY`(tts-cache 업로드 포함) / `GOOGLE_TTS_API_KEY`(placeholder→실키 교체 완료) 용도 주석 보강 |

---

---

## v2.5 → v2.6 변경 요약 (2026.06.09)

| 섹션 | 변경 내용 |
|---|---|
| §1.1 DB user_profiles | role CHECK 제약에 'child' 추가 (migration 014) |
| §1.6 마이그레이션 | migration 013 실행 완료 상태 정정; migration 014(`014_add_child_role.sql`) 행 신규 추가 |
| §3.14 BookshelfClient | `userRole` prop 추가, child 모드(ChildConnectForm, 빈 상태 분기, 부제목) 명세 |
| §3.15 ChildConnectForm (신규) | BookshelfClient 내부 컴포넌트 — 초대 코드 입력 → `POST /api/group` → 스토리 목록 리로드 |
| §3.16 미들웨어 child 보호 로직 (신규) | CHILD_ALLOWED/CHILD_BLOCKED 배열 기반 경로 보호; child 로그인 후 /bookshelf 리다이렉트 |
| §3.17 SideBar/BottomNavBar 필터링 (신규) | CHILD_NAV_HREFS = ['/bookshelf', '/settings'], child는 2개 메뉴만 렌더링 |
| §7 타입 | `UserRole`에 `'child'` 추가; `RECORDER_ROLE_META` child 항목 추가 |

---

*StoryBridge LLD v2.6 | 2026.06.09*
