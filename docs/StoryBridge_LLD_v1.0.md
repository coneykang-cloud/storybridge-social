# StoryBridge LLD (Low-Level Design)

**버전:** v1.0  
**작성일:** 2026.06.04  
**작성자:** 강현정  
**참조:** StoryBridge_PRD_v1.0.md, StoryBridge_HLD_v1.0.md

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

### 1.1 users (Supabase Auth + 확장)

```sql
-- Supabase Auth가 auth.users 자동 관리
-- 추가 프로필 정보는 별도 테이블

CREATE TABLE public.user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('parent', 'therapist', 'teacher')),
  phone        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 프로필 읽기" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "본인 프로필 수정" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

### 1.2 children (아동 프로필)

```sql
CREATE TABLE public.children (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  birth_year      INTEGER NOT NULL,           -- 연령 계산용
  age_group       TEXT NOT NULL CHECK (age_group IN ('7-9', '10-13', '14-18')),
  interests       TEXT[],                     -- 관심사 배열 (ex: ['공룡', '기차'])
  familiar_envs   TEXT[],                     -- 친숙한 환경 (ex: ['학교', '집'])
  notes           TEXT,                       -- 치료사/보호자 메모
  avatar_id       UUID,                       -- 현재 기본 아바타
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "보호자 읽기/쓰기" ON children
  FOR ALL USING (auth.uid() = parent_id);
CREATE POLICY "그룹 멤버 읽기" ON children
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN groups g ON g.id = gm.group_id
      WHERE g.child_id = children.id
      AND gm.user_id = auth.uid()
    )
  );
```

### 1.3 avatars (AI 생성 아바타)

```sql
CREATE TABLE public.avatars (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  style         TEXT NOT NULL CHECK (style IN ('ghibli', 'realistic', 'pixar', 'watercolor')),
  image_url     TEXT NOT NULL,                -- Supabase Storage URL
  prompt_used   TEXT,                         -- DALL·E 프롬프트 (감사 로그)
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 아동당 최대 5개 제한 (트리거)
CREATE OR REPLACE FUNCTION check_avatar_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM avatars WHERE child_id = NEW.child_id) >= 5 THEN
    RAISE EXCEPTION 'Avatar limit reached (max 5 per child)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER avatar_limit_check
BEFORE INSERT ON avatars
FOR EACH ROW EXECUTE FUNCTION check_avatar_limit();
```

### 1.4 groups (협업 그룹)

```sql
CREATE TABLE public.groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  invite_code   TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.group_members (
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('parent', 'therapist', 'teacher')),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);
```

### 1.5 stories (스토리 메타데이터)

```sql
CREATE TABLE public.stories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES user_profiles(id),
  title           TEXT NOT NULL,
  chunking_type   TEXT NOT NULL DEFAULT 'temporal'
                    CHECK (chunking_type IN ('temporal', 'spatial', 'mixed')),
  source          TEXT NOT NULL DEFAULT 'ai'
                    CHECK (source IN ('ai', 'pool', 'manual')),
  pool_template_id UUID REFERENCES story_pool(id),
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
  raw_input       TEXT,                       -- 사용자 원본 줄글
  six_wh          JSONB,                      -- AI 추출 6WH 구조체
  page_count      INTEGER DEFAULT 0 CHECK (page_count <= 10),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.6 story_pages (페이지 내용)

```sql
CREATE TABLE public.story_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  page_number     INTEGER NOT NULL CHECK (page_number BETWEEN 1 AND 10),
  page_type       TEXT NOT NULL CHECK (page_type IN ('intro', 'body', 'conclusion')),
  image_url       TEXT,
  image_prompt    TEXT,                       -- DALL·E 프롬프트
  descriptive     TEXT,                       -- 설명문
  perspective     TEXT,                       -- 조망문
  coaching        TEXT,                       -- 지시문 (비율 강제)
  chunking_label  TEXT,                       -- 청킹 표지어 (예: "먼저")
  tts_url         TEXT,                       -- 캐싱된 TTS 음성 URL
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (story_id, page_number)
);
```

### 1.7 story_pool (템플릿 라이브러리)

```sql
CREATE TABLE public.story_pool (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group       TEXT NOT NULL CHECK (age_group IN ('7-9', '10-13', '14-18')),
  category        TEXT NOT NULL CHECK (category IN ('school', 'daily')),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  base_pages      JSONB NOT NULL,             -- 기본 페이지 내용 배열
  thumbnail_url   TEXT,
  tags            TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.8 approvals (수정 승인 이력)

```sql
CREATE TABLE public.approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  page_id         UUID REFERENCES story_pages(id),  -- NULL이면 스토리 전체
  requester_id    UUID NOT NULL REFERENCES user_profiles(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  diff_before     JSONB NOT NULL,             -- 변경 전 내용
  diff_after      JSONB NOT NULL,             -- 변경 후 내용
  feedback        TEXT,                       -- 거절 시 피드백
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);
```

### 1.9 comments (자문 댓글)

```sql
CREATE TABLE public.comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  page_id         UUID REFERENCES story_pages(id),  -- NULL이면 스토리 전체
  author_id       UUID NOT NULL REFERENCES user_profiles(id),
  content         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. API 엔드포인트 명세

### 2.1 인증 API

| Method | Path | 설명 | Auth |
|---|---|---|---|
| POST | `/api/auth/signup` | 회원가입 (역할 포함) | 없음 |
| POST | `/api/auth/signin` | 로그인 | 없음 |
| POST | `/api/auth/signout` | 로그아웃 | 필요 |
| GET | `/api/auth/me` | 현재 사용자 정보 | 필요 |

### 2.2 아동 프로필 API

| Method | Path | 설명 | Auth |
|---|---|---|---|
| POST | `/api/children` | 아동 등록 | parent |
| GET | `/api/children` | 내 아동 목록 | 필요 |
| GET | `/api/children/[id]` | 아동 상세 | 그룹 멤버 |
| PATCH | `/api/children/[id]` | 아동 정보 수정 | parent |

### 2.3 아바타 API

| Method | Path | 설명 | Auth |
|---|---|---|---|
| POST | `/api/avatar/generate` | DALL·E 3 아바타 생성 | parent |
| GET | `/api/avatar/[childId]` | 아바타 목록 조회 | 그룹 멤버 |
| DELETE | `/api/avatar/[id]` | 아바타 삭제 | parent |
| PATCH | `/api/avatar/[id]/default` | 기본 아바타 설정 | parent |

**POST `/api/avatar/generate` 요청/응답:**
```typescript
// Request
{
  child_id: string;
  style: 'ghibli' | 'realistic' | 'pixar' | 'watercolor';
  photo_url: string;   // Supabase Storage 임시 업로드 URL
}

// Response (202 Accepted → 폴링)
{
  job_id: string;
  status: 'processing';
}

// GET /api/avatar/job/[jobId] 폴링
{
  status: 'completed' | 'processing' | 'failed';
  avatar?: Avatar;
  error?: string;
}
```

### 2.4 스토리 API

| Method | Path | 설명 | Auth |
|---|---|---|---|
| POST | `/api/story/generate` | AI 스토리 생성 (스트리밍) | 필요 |
| POST | `/api/story/pool` | Pool 템플릿으로 생성 | 필요 |
| GET | `/api/story` | 스토리 목록 | 필요 |
| GET | `/api/story/[id]` | 스토리 상세 + 페이지 | 필요 |
| PATCH | `/api/story/[id]` | 스토리 메타 수정 | 필요 |
| DELETE | `/api/story/[id]` | 스토리 삭제 | parent |
| PATCH | `/api/story/[id]/page/[pageId]` | 페이지 인라인 편집 | 필요 |
| POST | `/api/story/[id]/page/[pageId]/regenerate` | 페이지 재생성 | 필요 |

**POST `/api/story/generate` 요청:**
```typescript
{
  child_id: string;
  raw_input: string;          // 자유 줄글
  chunking_type: 'temporal' | 'spatial' | 'mixed';
  avatar_id?: string;         // 사용할 아바타
}

// Response: Server-Sent Events 스트리밍
// 이벤트 형식:
// event: page
// data: { page_number: 1, page_type: 'intro', descriptive: '...', ... }

// event: done
// data: { story_id: '...', page_count: 8 }

// event: clarify (6WH 누락 시)
// data: { questions: ['이 일은 주로 어디에서 일어나나요?'] }
```

### 2.5 TTS API

| Method | Path | 설명 | Auth |
|---|---|---|---|
| GET | `/api/tts` | 음성 합성 (캐시 우선) | 필요 |

```typescript
// Query params
?text=안녕하세요&voice=female&page_id=uuid

// Response
{
  audio_url: string;      // Supabase Storage URL
  word_timings: Array<{ word: string; start_ms: number; end_ms: number }>;
}
```

### 2.6 협업 API

| Method | Path | 설명 | Auth |
|---|---|---|---|
| POST | `/api/group` | 그룹 생성 | parent |
| POST | `/api/group/join` | 초대 코드로 참여 | 필요 |
| GET | `/api/group/[id]` | 그룹 정보 + 멤버 | 그룹 멤버 |
| POST | `/api/approval` | 수정 승인 요청 | 그룹 멤버 |
| PATCH | `/api/approval/[id]` | 승인/거절 | parent |
| GET | `/api/approval/[storyId]` | 승인 이력 | 그룹 멤버 |
| POST | `/api/comment` | 댓글 작성 | 그룹 멤버 |
| GET | `/api/comment/[storyId]` | 댓글 목록 | 그룹 멤버 |

### 2.7 Pool API

| Method | Path | 설명 | Auth |
|---|---|---|---|
| GET | `/api/pool` | 템플릿 목록 (필터) | 필요 |
| GET | `/api/pool/[id]` | 템플릿 상세 | 필요 |

```typescript
// Query params
?age_group=7-9&category=school
```

---

## 3. 컴포넌트 상세 명세

### 3.1 StoryEditor (인라인 편집)

```typescript
// props
interface StoryEditorProps {
  story: Story;
  pages: StoryPage[];
  onPageUpdate: (pageId: string, content: Partial<StoryPageContent>) => void;
  onPageRegenerate: (pageId: string) => void;
  onSave: () => void;
  readOnly?: boolean;   // 치료사/선생님은 수정 제안 모드
}

// 내부 상태
- editingPageId: string | null     // 현재 편집 중인 페이지
- isDirty: boolean                 // 미저장 변경 추적
- isRegenerating: boolean          // AI 재생성 중
```

### 3.2 StoryViewer (뷰어 3모드)

```typescript
interface StoryViewerProps {
  pages: StoryPage[];
  mode: 'manual' | 'autoplay' | 'slideshow';
  slideshowInterval?: 3 | 5 | 7;   // 초
  voice?: 'male' | 'female' | 'child';
  highContrast?: boolean;
}

// 내부 상태
- currentPage: number              // 0-indexed
- isPlaying: boolean
- audioRef: RefObject<HTMLAudioElement>
- highlightWordIndex: number
```

### 3.3 AvatarStudio

```typescript
interface AvatarStudioProps {
  childId: string;
  existingAvatars: Avatar[];       // 현재 보유 아바타 목록
  onAvatarGenerated: (avatar: Avatar) => void;
}

// 생성 단계
type GenerationStep = 
  | 'upload'       // 사진 업로드
  | 'style'        // 스타일 선택
  | 'generating'   // AI 처리 중 (폴링)
  | 'preview'      // 결과 확인
  | 'saved'        // 저장 완료
```

### 3.4 CollabPanel (협업 패널)

```typescript
interface CollabPanelProps {
  storyId: string;
  groupId: string;
  currentUserRole: 'parent' | 'therapist' | 'teacher';
  pages: StoryPage[];
}

// 실시간 상태
- pendingApprovals: Approval[]
- comments: Comment[]
- isConnected: boolean   // Supabase Realtime 연결 상태
```

---

## 4. 상태 관리 설계 (Zustand)

### 4.1 스토어 구조

```typescript
// stores/auth.store.ts
interface AuthStore {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// stores/child.store.ts
interface ChildStore {
  children: Child[];
  selectedChild: Child | null;
  selectChild: (id: string) => void;
  fetchChildren: () => Promise<void>;
}

// stores/story.store.ts
interface StoryStore {
  stories: Story[];
  currentStory: Story | null;
  currentPages: StoryPage[];
  isGenerating: boolean;
  generationProgress: number;   // 0-10 페이지 진행
  generateStory: (input: GenerateInput) => Promise<void>;
  updatePage: (pageId: string, content: Partial<StoryPageContent>) => void;
}

// stores/collab.store.ts
interface CollabStore {
  pendingApprovals: Approval[];
  notifications: Notification[];
  realtimeChannel: RealtimeChannel | null;
  connectToGroup: (groupId: string) => void;
  disconnectFromGroup: () => void;
}

// stores/ui.store.ts
interface UIStore {
  highContrast: boolean;
  viewerMode: 'manual' | 'autoplay' | 'slideshow';
  toggleHighContrast: () => void;
  setViewerMode: (mode: ViewerMode) => void;
}
```

---

## 5. AI 프롬프트 템플릿

### 5.1 STAGE 1: 6WH 추출 프롬프트

```
SYSTEM:
당신은 Carol Gray Social Stories™ 전문가입니다.
주어진 텍스트에서 소셜 스토리 작성에 필요한 6WH 요소를 추출하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "who": "등장인물 (문자열 또는 null)",
  "when": "시간적 맥락 (문자열 또는 null)",
  "where": "장소 (문자열 또는 null)",
  "what": "상황 설명 (문자열 또는 null)",
  "how": "대처 행동 (문자열 또는 null)",
  "why": "이유/목적 (문자열 또는 null)",
  "missing": ["누락된 항목 키 배열"],
  "child_name": "아동 이름 (추출 가능 시)"
}

USER:
아동 정보: 이름={name}, 나이={age}세, 관심사={interests}
입력 텍스트: {raw_input}
```

### 5.2 STAGE 2: 소셜 스토리 생성 프롬프트

```
SYSTEM:
당신은 ASD(자폐 스펙트럼 장애) 아동을 위한 소셜 스토리 전문 작가입니다.
Carol Gray Social Stories™ 10.4 기준을 엄격히 준수하세요.

## 필수 규칙
1. 문장 비율: 설명문(Descriptive) + 조망문(Perspective) ≥ 4배 수 이상 / 지시문(Coaching)
2. 긍정·칭찬 문장: 전체의 최소 50%
3. 어조: 따뜻하고 인내심 있는 1인칭 또는 3인칭 (부정적 표현 금지)
4. 청킹 방식: {chunking_type}
   - temporal: 각 페이지를 '먼저', '그 다음', '마지막으로' 시간 표지어로 구분
   - spatial: 각 페이지를 '[장소]에서' 공간 맥락으로 구분
   - mixed: 시간 + 공간 표지어 동시 사용
5. 페이지 구성: 도입 1페이지 + 본문 최대 8페이지 + 결론 1페이지

## 아동 정보
이름: {child_name}
나이: {age}세 ({age_group} 그룹)
관심사: {interests}
친숙한 환경: {familiar_envs}

## 6WH 구조
누가: {who}
언제: {when}
어디서: {where}
무엇을: {what}
어떻게: {how}
왜: {why}

## 출력 형식 (JSON 배열)
[
  {
    "page_number": 1,
    "page_type": "intro",
    "chunking_label": null,
    "descriptive": "설명문 텍스트",
    "perspective": "조망문 텍스트 (없으면 null)",
    "coaching": null,
    "image_prompt": "DALL·E 3용 이미지 프롬프트 (영문, {avatar_style} 스타일)"
  },
  ...
]

USER:
위 정보를 바탕으로 {child_name}를 위한 소셜 스토리를 생성하세요.
```

### 5.3 DALL·E 3 아바타 프롬프트 템플릿

```
# 지브리풍
"Studio Ghibli anime style character illustration of a {age}-year-old {gender} Korean child
with {hair_description}. Warm, soft colors, expressive large eyes, gentle smile.
White background, high quality, character design sheet.
Child-safe, wholesome, no text."

# 픽사풍
"Pixar/Disney 3D animated character of a {age}-year-old Korean child, cute and friendly.
Big expressive eyes, rounded features, warm lighting.
Character concept art style, white background, high quality."

# 수채화
"Soft watercolor illustration of a {age}-year-old Korean child, gentle brushstrokes,
pastel colors, dreamy and warm aesthetic. White background, hand-painted look."

# 사진닮은꼴
"Realistic but stylized illustration of a Korean child aged {age},
based on reference photo. Warm, friendly portrait, professional children's book illustration style."
```

---

## 6. 파일 구조

```
storybridge/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── signin/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (main)/
│   │   │   ├── layout.tsx               ← 사이드바/하단 네비게이션
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── avatar-studio/page.tsx
│   │   │   ├── story/
│   │   │   │   ├── create/
│   │   │   │   │   ├── page.tsx          ← 생성 방식 선택
│   │   │   │   │   ├── pool/page.tsx     ← Pool 탐색
│   │   │   │   │   └── ai/page.tsx       ← AI 생성
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx          ← 스토리 편집
│   │   │   │   │   └── view/page.tsx     ← 스토리 뷰어
│   │   │   └── collab/
│   │   │       └── [groupId]/page.tsx
│   │   └── api/
│   │       ├── auth/[...supabase]/route.ts
│   │       ├── children/route.ts
│   │       ├── avatar/
│   │       │   ├── generate/route.ts
│   │       │   └── [childId]/route.ts
│   │       ├── story/
│   │       │   ├── generate/route.ts     ← SSE 스트리밍
│   │       │   ├── pool/route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── page/[pageId]/route.ts
│   │       ├── tts/route.ts
│   │       ├── group/route.ts
│   │       ├── approval/route.ts
│   │       └── comment/route.ts
│   ├── components/
│   │   ├── ui/                           ← 기본 UI 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── layout/
│   │   │   ├── BottomNavBar.tsx          ← 모바일 하단 네비게이션
│   │   │   ├── SideBar.tsx              ← 태블릿/데스크톱
│   │   │   └── Header.tsx
│   │   ├── story/
│   │   │   ├── StoryCard.tsx
│   │   │   ├── StoryEditor.tsx
│   │   │   ├── StoryViewer.tsx
│   │   │   ├── PageEditor.tsx
│   │   │   ├── ChunkingSelector.tsx
│   │   │   └── SixWHGuide.tsx
│   │   ├── avatar/
│   │   │   ├── AvatarStudio.tsx
│   │   │   ├── AvatarCard.tsx
│   │   │   └── StyleSelector.tsx
│   │   ├── collab/
│   │   │   ├── CollabPanel.tsx
│   │   │   ├── ApprovalCard.tsx
│   │   │   ├── CommentThread.tsx
│   │   │   └── DiffViewer.tsx
│   │   └── accessibility/
│   │       ├── HighContrastToggle.tsx
│   │       └── TTSController.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                ← 클라이언트 인스턴스
│   │   │   ├── server.ts                ← 서버 인스턴스
│   │   │   └── middleware.ts
│   │   ├── openai/
│   │   │   ├── client.ts
│   │   │   ├── story.ts                 ← 스토리 생성 로직
│   │   │   └── avatar.ts               ← 아바타 생성 로직
│   │   ├── tts/
│   │   │   └── google.ts
│   │   ├── prompts/
│   │   │   ├── six-wh.ts
│   │   │   ├── story-generation.ts
│   │   │   └── avatar-styles.ts
│   │   └── utils/
│   │       ├── chunking.ts
│   │       └── carol-gray.ts            ← 10.4 비율 검증
│   ├── stores/
│   │   ├── auth.store.ts
│   │   ├── child.store.ts
│   │   ├── story.store.ts
│   │   ├── collab.store.ts
│   │   └── ui.store.ts
│   └── types/
│       ├── database.types.ts            ← Supabase 자동 생성 타입
│       └── app.types.ts                 ← 앱 도메인 타입
├── public/
│   ├── fonts/                           ← Pretendard 폰트
│   └── icons/
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 7. TypeScript 타입 정의

```typescript
// types/app.types.ts

export type UserRole = 'parent' | 'therapist' | 'teacher';
export type AvatarStyle = 'ghibli' | 'realistic' | 'pixar' | 'watercolor';
export type AgeGroup = '7-9' | '10-13' | '14-18';
export type ChunkingType = 'temporal' | 'spatial' | 'mixed';
export type StorySource = 'ai' | 'pool' | 'manual';
export type StoryStatus = 'draft' | 'published' | 'archived';
export type PageType = 'intro' | 'body' | 'conclusion';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ViewerMode = 'manual' | 'autoplay' | 'slideshow';
export type TTSVoice = 'male' | 'female' | 'child';

export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
}

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  birth_year: number;
  age_group: AgeGroup;
  interests: string[];
  familiar_envs: string[];
  notes?: string;
  avatar_id?: string;
  created_at: string;
}

export interface Avatar {
  id: string;
  child_id: string;
  style: AvatarStyle;
  image_url: string;
  is_default: boolean;
  created_at: string;
}

export interface Story {
  id: string;
  child_id: string;
  creator_id: string;
  title: string;
  chunking_type: ChunkingType;
  source: StorySource;
  status: StoryStatus;
  raw_input?: string;
  six_wh?: SixWH;
  page_count: number;
  created_at: string;
  updated_at: string;
}

export interface SixWH {
  who: string | null;
  when: string | null;
  where: string | null;
  what: string | null;
  how: string | null;
  why: string | null;
  missing: string[];
  child_name?: string;
}

export interface StoryPage {
  id: string;
  story_id: string;
  page_number: number;
  page_type: PageType;
  image_url?: string;
  image_prompt?: string;
  descriptive?: string;
  perspective?: string;
  coaching?: string;
  chunking_label?: string;
  tts_url?: string;
}

export interface Approval {
  id: string;
  story_id: string;
  page_id?: string;
  requester_id: string;
  status: ApprovalStatus;
  diff_before: Partial<StoryPage>;
  diff_after: Partial<StoryPage>;
  feedback?: string;
  created_at: string;
  resolved_at?: string;
}

export interface Comment {
  id: string;
  story_id: string;
  page_id?: string;
  author_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface WordTiming {
  word: string;
  start_ms: number;
  end_ms: number;
}
```

---

## 8. 환경 변수 명세

```bash
# .env.local (로컬 개발용 — Git 제외)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...   # 서버 전용

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Google Cloud TTS
GOOGLE_TTS_API_KEY=AIzaSy...
GOOGLE_TTS_PROJECT_ID=storybridge-xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 이미지 업로드 제한
MAX_UPLOAD_SIZE_MB=5
```

---

*StoryBridge LLD v1.0 | 2026.06.04*
