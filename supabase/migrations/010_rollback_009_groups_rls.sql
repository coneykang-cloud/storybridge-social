-- ──────────────────────────────────────────────────
-- 009_groups_rls_policies.sql 롤백
--
-- 009에서 추가한 정책/함수가 group_members ↔ is_group_member 사이에서
-- 재귀(infinite recursion)를 일으켜, group_members/groups를 참조하는
-- children·stories·behavior_observations 등 거의 모든 쿼리가 에러로
-- 실패하고 앱에서는 빈 목록으로 표시되는 문제가 발생함.
--
-- 주의: 이 롤백은 정책/함수만 제거하며, 실제 데이터(children/stories/
-- behavior_observations 등)는 처음부터 손상되지 않았으므로 그대로 남아있음.
-- 009에서 백필된 groups/group_members 행도 무해하므로 그대로 둠.
-- ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "그룹 멤버·보호자 조회" ON public.groups;
DROP POLICY IF EXISTS "보호자 그룹 생성" ON public.groups;
DROP POLICY IF EXISTS "그룹 멤버 상호 조회" ON public.group_members;
DROP POLICY IF EXISTS "본인 멤버십 추가" ON public.group_members;
DROP FUNCTION IF EXISTS public.is_group_member(UUID, UUID);
