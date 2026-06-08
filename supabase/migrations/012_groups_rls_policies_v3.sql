-- ──────────────────────────────────────────────────
-- groups / group_members RLS 정책 재적용 (3차 — 교차 테이블 순환 참조 수정판)
--
-- 011이 다시 실패한 원인: 새로 추가한 groups SELECT 정책이
-- `EXISTS (SELECT ... FROM children WHERE ... parent_id = auth.uid())`로
-- children 테이블을 직접(=RLS 적용 상태로) 조회했음. 그런데 children의
-- 기존 정책 "그룹 멤버 조회"는 반대로 groups/group_members를 조회함.
-- → children 평가 시 groups 정책이 평가되고, 그 안에서 다시 children이
--   평가되는 교차 테이블 무한 루프 발생 (is_group_member의 plpgsql 수정과는
--   무관한 별개의 순환 참조).
--
-- 수정: "이 사용자가 이 아이의 보호자인가?"를 SECURITY DEFINER plpgsql 함수로
-- 만들어 children RLS를 우회해서 직접 확인 → groups 정책이 children 정책을
-- 다시 트리거하지 않으므로 순환이 끊어짐.
-- ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_child_parent(p_child_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.children
    WHERE id = p_child_id AND parent_id = p_user_id
  );
END;
$$;

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
-- children을 직접 조회하지 않고 is_child_parent()로 우회 조회 → 순환 차단
CREATE POLICY "그룹 멤버·보호자 조회" ON public.groups FOR SELECT USING (
  public.is_group_member(groups.id, auth.uid())
  OR public.is_child_parent(groups.child_id, auth.uid())
);

CREATE POLICY "보호자 그룹 생성" ON public.groups FOR INSERT WITH CHECK (
  public.is_child_parent(groups.child_id, auth.uid())
);

-- ── group_members ───────────────────────────────────────────
CREATE POLICY "그룹 멤버 상호 조회" ON public.group_members FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_group_member(group_members.group_id, auth.uid())
);

CREATE POLICY "본인 멤버십 추가" ON public.group_members FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- ── 백필: 누락된 기존 아동의 그룹·멤버십 보충 (이미 적용됐다면 중복 없이 건너뜀) ──
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
