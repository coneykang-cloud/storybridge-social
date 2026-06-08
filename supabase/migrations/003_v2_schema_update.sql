-- StoryBridge v2 스키마 업데이트
-- PRD v3.0 반영: 3-Track 모델, 청킹 2차원, 누적 제시

-- ──────────────────────────────────────────────────
-- stories 테이블 컬럼 추가
-- ──────────────────────────────────────────────────
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'B'
    CHECK (track IN ('A', 'B', 'C')),
  ADD COLUMN IF NOT EXISTS created_by_role TEXT NOT NULL DEFAULT 'parent'
    CHECK (created_by_role IN ('parent', 'therapist', 'teacher')),
  ADD COLUMN IF NOT EXISTS chunking_type TEXT NOT NULL DEFAULT 'mixed'
    CHECK (chunking_type IN ('temporal', 'spatial', 'mixed')),
  ADD COLUMN IF NOT EXISTS presentation_mode TEXT NOT NULL DEFAULT 'cumulative'
    CHECK (presentation_mode IN ('cumulative', 'sequential')),
  ADD COLUMN IF NOT EXISTS therapy_goal_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS school_context_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS home_connection_memo TEXT;

-- ──────────────────────────────────────────────────
-- story_pages 테이블 컬럼 추가
-- ──────────────────────────────────────────────────
ALTER TABLE public.story_pages
  ADD COLUMN IF NOT EXISTS cumulative_strip_text TEXT;

-- ──────────────────────────────────────────────────
-- approvals 테이블 컬럼 추가
-- ──────────────────────────────────────────────────
ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS track TEXT
    CHECK (track IN ('A', 'B', 'C'));

-- ──────────────────────────────────────────────────
-- 인덱스 추가
-- ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stories_track ON public.stories(track);
CREATE INDEX IF NOT EXISTS idx_stories_chunking ON public.stories(chunking_type, presentation_mode);

-- ──────────────────────────────────────────────────
-- RLS 정책 정리 후 재생성 (중복 방지)
-- ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "보호자 스토리 수정" ON public.stories;
DROP POLICY IF EXISTS "치료사 스토리 수정" ON public.stories;
DROP POLICY IF EXISTS "교사 스토리 수정" ON public.stories;

-- 보호자: 본인 아동 스토리 전체 수정 가능
CREATE POLICY "보호자 스토리 수정" ON public.stories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      WHERE c.id = stories.child_id
      AND c.parent_id = auth.uid()
    )
  );

-- 치료사: 본인 생성 또는 그룹 내 스토리 수정 + 청킹 설정 수정 가능
CREATE POLICY "치료사 스토리 수정" ON public.stories
  FOR UPDATE
  USING (
    stories.creator_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'therapist'
      )
      AND EXISTS (
        SELECT 1 FROM public.group_members gm
        JOIN public.groups g ON g.id = gm.group_id
        WHERE g.child_id = stories.child_id
        AND gm.user_id = auth.uid()
      )
    )
  );

-- 교사: 본인 생성 스토리 수정 가능
CREATE POLICY "교사 스토리 수정" ON public.stories
  FOR UPDATE
  USING (stories.creator_id = auth.uid());
