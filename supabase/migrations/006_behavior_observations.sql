-- ============================================================
-- migration 006: behavior_observations
-- ABC 행동 관찰 기록 테이블 + stories.observation_id FK
-- 작성: 2026-06-08
-- ============================================================

-- 1. behavior_observations 테이블 생성
CREATE TABLE IF NOT EXISTS public.behavior_observations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id             UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  therapist_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  -- ABC 필드
  antecedent           TEXT NOT NULL,
  behavior             TEXT NOT NULL,
  consequence          TEXT NOT NULL,
  replacement_behavior TEXT,

  -- 관찰 맥락
  setting              TEXT NOT NULL DEFAULT 'clinic'
    CHECK (setting IN ('clinic', 'school', 'home')),

  -- SEAT 기능 분류 (복수 선택 가능)
  seat_function        TEXT[] NOT NULL DEFAULT '{}',

  -- 연결 정보
  observed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  story_id             UUID REFERENCES public.stories(id) ON DELETE SET NULL,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. stories 테이블에 observation_id 컬럼 추가
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS observation_id UUID
  REFERENCES public.behavior_observations(id) ON DELETE SET NULL;

-- 3. RLS 활성화
ALTER TABLE public.behavior_observations ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책: 치료사 본인만 접근 가능
CREATE POLICY "therapist_own_observations_select"
  ON public.behavior_observations
  FOR SELECT
  USING (therapist_id = auth.uid());

CREATE POLICY "therapist_own_observations_insert"
  ON public.behavior_observations
  FOR INSERT
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "therapist_own_observations_update"
  ON public.behavior_observations
  FOR UPDATE
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "therapist_own_observations_delete"
  ON public.behavior_observations
  FOR DELETE
  USING (therapist_id = auth.uid());

-- 5. 인덱스
CREATE INDEX IF NOT EXISTS idx_observations_child_id
  ON public.behavior_observations(child_id);

CREATE INDEX IF NOT EXISTS idx_observations_therapist_id
  ON public.behavior_observations(therapist_id);

CREATE INDEX IF NOT EXISTS idx_observations_observed_at
  ON public.behavior_observations(observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_observations_story_id
  ON public.behavior_observations(story_id)
  WHERE story_id IS NOT NULL;

-- 6. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_behavior_observations_updated_at
  BEFORE UPDATE ON public.behavior_observations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
