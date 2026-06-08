-- ──────────────────────────────────────────────────
-- groups / group_members RLS 정책 재적용 (009의 재귀 버그 수정판)
--
-- 009가 실패한 원인: is_group_member()를 `LANGUAGE sql STABLE`로 작성했더니
-- 플래너가 함수 본문을 호출 쿼리에 인라인(inlining)해버려, SECURITY DEFINER로
-- RLS를 우회해야 할 내부 조회가 호출자의 RLS 컨텍스트에서 실행됨 →
-- group_members 정책이 자기 자신을 다시 평가하는 무한 재귀 발생.
--
-- 수정: `LANGUAGE plpgsql`로 작성하면 인라인되지 않으므로 SECURITY DEFINER
-- 컨텍스트(테이블 소유자 권한 = RLS 우회)가 그대로 유지되어 재귀 없이
-- 멤버십을 확인할 수 있음 (Supabase/Postgres 공식 권장 패턴).
-- ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$;

-- ── groups ──────────────────────────────────────────────────
CREATE POLICY "그룹 멤버·보호자 조회" ON public.groups FOR SELECT USING (
  public.is_group_member(groups.id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.children c WHERE c.id = groups.child_id AND c.parent_id = auth.uid())
);

CREATE POLICY "보호자 그룹 생성" ON public.groups FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.children c WHERE c.id = groups.child_id AND c.parent_id = auth.uid())
);

-- ── group_members ───────────────────────────────────────────
CREATE POLICY "그룹 멤버 상호 조회" ON public.group_members FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_group_member(group_members.group_id, auth.uid())
);

CREATE POLICY "본인 멤버십 추가" ON public.group_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- ── 백필: 누락된 기존 아동의 그룹·멤버십 보충 (009에서 이미 적용됐다면 중복 없이 건너뜀) ──
INSERT INTO public.groups (child_id)
SELECT c.id FROM public.children c
WHERE NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.child_id = c.id);

INSERT INTO public.group_members (group_id, user_id, role)
SELECT g.id, c.parent_id, 'parent'
FROM public.groups g
JOIN public.children c ON c.id = g.child_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.group_members gm WHERE gm.group_id = g.id AND gm.user_id = c.parent_id
);
