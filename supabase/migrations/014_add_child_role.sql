-- user_profiles.role CHECK 제약에 'child' 추가
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('parent', 'therapist', 'teacher', 'child'));

-- group_members.role CHECK 제약에 'child' 추가
ALTER TABLE public.group_members
  DROP CONSTRAINT IF EXISTS group_members_role_check;

ALTER TABLE public.group_members
  ADD CONSTRAINT group_members_role_check
  CHECK (role IN ('parent', 'therapist', 'teacher', 'child'));
