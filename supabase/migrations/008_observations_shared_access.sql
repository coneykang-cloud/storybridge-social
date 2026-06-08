-- ============================================================
-- migration 008: behavior_observations 공유 조회·협업 권한 확장
-- 같은 아이에 대한 접근 권한(보호자 본인 또는 그룹 멤버)을 가진 사용자는
-- 누가 작성했든 관찰 기록을 조회할 수 있도록 SELECT 정책을 확장.
-- 치료사는 자신이 작성하지 않은 기록에 대해서도 SEAT 분류·대체행동 목표를
-- 추가/수정할 수 있도록 UPDATE 정책을 확장 (컬럼 단위 제한은 API 레이어에서 검증).
-- 작성: 2026-06-08
-- ============================================================

DROP POLICY IF EXISTS "observations_select_own" ON public.behavior_observations;
DROP POLICY IF EXISTS "observations_update_own" ON public.behavior_observations;

-- 조회: 작성자 본인 OR 아이에 대한 접근 권한(보호자 본인 또는 그룹 멤버) 보유자
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

-- 수정: 작성자 본인 OR (치료사이면서 아이에 대한 접근 권한 보유) — 컬럼 제한은 API에서 처리
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
