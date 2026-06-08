-- StoryBridge v4: 연령대 5구간으로 변경
-- 기존: '7-9' | '10-13' | '14-18'
-- 변경: '5-6' | '7-9' | '10-12' | '13-15' | '16-18'

-- children 테이블 CHECK 제약 변경
ALTER TABLE public.children
  DROP CONSTRAINT IF EXISTS children_age_group_check;

ALTER TABLE public.children
  ADD CONSTRAINT children_age_group_check
  CHECK (age_group IN ('5-6', '7-9', '10-12', '13-15', '16-18'));

-- 기존 데이터 마이그레이션 (기존 구간 → 새 구간 매핑)
UPDATE public.children SET age_group = '7-9'   WHERE age_group = '7-9';   -- 유지
UPDATE public.children SET age_group = '10-12' WHERE age_group = '10-13'; -- 변경
UPDATE public.children SET age_group = '16-18' WHERE age_group = '14-18'; -- 변경 (14~18 → 16~18로 이동)

-- story_pool 테이블 CHECK 제약 변경
ALTER TABLE public.story_pool
  DROP CONSTRAINT IF EXISTS story_pool_age_group_check;

ALTER TABLE public.story_pool
  ADD CONSTRAINT story_pool_age_group_check
  CHECK (age_group IN ('5-6', '7-9', '10-12', '13-15', '16-18'));

-- story_pool 기존 데이터 마이그레이션
UPDATE public.story_pool SET age_group = '10-12' WHERE age_group = '10-13';
UPDATE public.story_pool SET age_group = '16-18' WHERE age_group = '14-18';

-- 확인
SELECT DISTINCT age_group FROM public.children;
SELECT DISTINCT age_group FROM public.story_pool;
