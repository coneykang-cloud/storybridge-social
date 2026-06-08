-- ──────────────────────────────────────────────────
-- groups / group_members RLS 정책 추가
--
-- 문제: 001_initial_schema.sql에서 두 테이블 모두 RLS를 활성화했지만
-- CREATE POLICY가 하나도 없어 모든 접근(SELECT/INSERT 포함)이 차단되고 있었음.
-- 그 결과 아동 등록 시 그룹 생성(/api/children)도 조용히 실패해 그룹 자체가
-- 생성되지 않았고, 협업 공간에서 초대코드를 아무도 볼 수 없었음.
-- ──────────────────────────────────────────────────

-- group_members를 직접 재조회할 때 발생하는 정책 재귀를 피하기 위한 헬퍼 함수
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
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

-- ── 백필: RLS로 인해 생성되지 못했던 기존 아동의 그룹·멤버십 보충 ──
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
