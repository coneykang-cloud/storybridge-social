-- ============================================================
-- migration 007: behavior_observations 작성 권한을 모든 역할로 확장
-- 보호자·교사도 ABC 관찰 기록을 작성할 수 있도록 변경.
-- SEAT 기능 분류·대체행동 목표는 치료사만 작성 가능한 컬럼으로 유지
-- (API 레이어에서 검증, recorder_role로 작성자 역할을 함께 기록)
-- 작성: 2026-06-08
-- ============================================================

-- 1. 컬럼 이름 변경: therapist_id → recorder_id (모든 역할의 기록자)
ALTER TABLE public.behavior_observations RENAME COLUMN therapist_id TO recorder_id;

-- 2. 작성자 역할 컬럼 추가 (치료사 전용 필드 작성 가능 여부 판단에 사용)
ALTER TABLE public.behavior_observations
  ADD COLUMN IF NOT EXISTS recorder_role TEXT NOT NULL DEFAULT 'therapist'
  CHECK (recorder_role IN ('parent', 'therapist', 'teacher'));
ALTER TABLE public.behavior_observations ALTER COLUMN recorder_role DROP DEFAULT;

-- 3. 기존 RLS 정책 제거 (치료사 전용)
DROP POLICY IF EXISTS "therapist_own_observations_select" ON public.behavior_observations;
DROP POLICY IF EXISTS "therapist_own_observations_insert" ON public.behavior_observations;
DROP POLICY IF EXISTS "therapist_own_observations_update" ON public.behavior_observations;
DROP POLICY IF EXISTS "therapist_own_observations_delete" ON public.behavior_observations;

-- 4. 신규 RLS 정책: 기록자 본인 + 아이에 대한 접근 권한(보호자 또는 그룹 멤버) 보유자만 작성 가능
CREATE POLICY "observations_select_own"
  ON public.behavior_observations FOR SELECT
  USING (recorder_id = auth.uid());

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

CREATE POLICY "observations_update_own"
  ON public.behavior_observations FOR UPDATE
  USING (recorder_id = auth.uid())
  WITH CHECK (recorder_id = auth.uid());

CREATE POLICY "observations_delete_own"
  ON public.behavior_observations FOR DELETE
  USING (recorder_id = auth.uid());

-- 5. 인덱스 이름 정리
ALTER INDEX IF EXISTS idx_observations_therapist_id RENAME TO idx_observations_recorder_id;
