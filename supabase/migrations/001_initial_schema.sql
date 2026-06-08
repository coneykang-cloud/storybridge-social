-- StoryBridge 초기 스키마
-- 실행 순서: Supabase Dashboard > SQL Editor에 붙여넣기

-- ──────────────────────────────────────────────────
-- 1. user_profiles
-- ──────────────────────────────────────────────────
CREATE TABLE public.user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('parent', 'therapist', 'teacher')),
  phone        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 가입 시 자동 프로필 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────
-- 2. children
-- ──────────────────────────────────────────────────
CREATE TABLE public.children (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  birth_year      INTEGER NOT NULL,
  age_group       TEXT NOT NULL CHECK (age_group IN ('7-9', '10-13', '14-18')),
  interests       TEXT[] DEFAULT '{}',
  familiar_envs   TEXT[] DEFAULT '{}',
  notes           TEXT,
  avatar_id       UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 3. avatars
-- ──────────────────────────────────────────────────
CREATE TABLE public.avatars (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  style         TEXT NOT NULL CHECK (style IN ('ghibli', 'realistic', 'pixar', 'watercolor')),
  image_url     TEXT NOT NULL,
  prompt_used   TEXT,
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 아바타 최대 5개 제한 트리거
CREATE OR REPLACE FUNCTION check_avatar_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM avatars WHERE child_id = NEW.child_id) >= 5 THEN
    RAISE EXCEPTION 'Avatar limit reached: maximum 5 avatars per child';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER avatar_limit_check
BEFORE INSERT ON avatars
FOR EACH ROW EXECUTE FUNCTION check_avatar_limit();

-- ──────────────────────────────────────────────────
-- 4. groups + group_members
-- ──────────────────────────────────────────────────
CREATE TABLE public.groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  invite_code   TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.group_members (
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('parent', 'therapist', 'teacher')),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ──────────────────────────────────────────────────
-- 5. story_pool (템플릿)
-- ──────────────────────────────────────────────────
CREATE TABLE public.story_pool (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group       TEXT NOT NULL CHECK (age_group IN ('7-9', '10-13', '14-18')),
  category        TEXT NOT NULL CHECK (category IN ('school', 'daily')),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  base_pages      JSONB NOT NULL DEFAULT '[]',
  thumbnail_url   TEXT,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 6. stories
-- ──────────────────────────────────────────────────
CREATE TABLE public.stories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  creator_id        UUID NOT NULL REFERENCES user_profiles(id),
  title             TEXT NOT NULL,
  chunking_type     TEXT NOT NULL DEFAULT 'temporal'
                      CHECK (chunking_type IN ('temporal', 'spatial', 'mixed')),
  source            TEXT NOT NULL DEFAULT 'ai'
                      CHECK (source IN ('ai', 'pool', 'manual')),
  pool_template_id  UUID REFERENCES story_pool(id),
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'published', 'archived')),
  raw_input         TEXT,
  six_wh            JSONB,
  page_count        INTEGER DEFAULT 0 CHECK (page_count <= 10),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 7. story_pages
-- ──────────────────────────────────────────────────
CREATE TABLE public.story_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  page_number     INTEGER NOT NULL CHECK (page_number BETWEEN 1 AND 10),
  page_type       TEXT NOT NULL CHECK (page_type IN ('intro', 'body', 'conclusion')),
  image_url       TEXT,
  image_prompt    TEXT,
  descriptive     TEXT,
  perspective     TEXT,
  coaching        TEXT,
  chunking_label  TEXT,
  tts_url         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (story_id, page_number)
);

-- ──────────────────────────────────────────────────
-- 8. approvals
-- ──────────────────────────────────────────────────
CREATE TABLE public.approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  page_id         UUID REFERENCES story_pages(id),
  requester_id    UUID NOT NULL REFERENCES user_profiles(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  diff_before     JSONB NOT NULL DEFAULT '{}',
  diff_after      JSONB NOT NULL DEFAULT '{}',
  feedback        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- ──────────────────────────────────────────────────
-- 9. comments
-- ──────────────────────────────────────────────────
CREATE TABLE public.comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  page_id         UUID REFERENCES story_pages(id),
  author_id       UUID NOT NULL REFERENCES user_profiles(id),
  content         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 10. 인덱스
-- ──────────────────────────────────────────────────
CREATE INDEX idx_children_parent_id ON children(parent_id);
CREATE INDEX idx_stories_child_id ON stories(child_id);
CREATE INDEX idx_story_pages_story_id ON story_pages(story_id);
CREATE INDEX idx_approvals_story_id ON approvals(story_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_comments_story_id ON comments(story_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- ──────────────────────────────────────────────────
-- 11. RLS 정책
-- ──────────────────────────────────────────────────
ALTER TABLE user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE children       ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatars        ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_pages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_pool     ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments       ENABLE ROW LEVEL SECURITY;

-- user_profiles
CREATE POLICY "본인 프로필 조회" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "본인 프로필 수정" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- children
CREATE POLICY "보호자 전체 접근" ON children FOR ALL USING (auth.uid() = parent_id);
CREATE POLICY "그룹 멤버 조회" ON children FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    WHERE g.child_id = children.id AND gm.user_id = auth.uid()
  )
);

-- avatars
CREATE POLICY "보호자 아바타 전체 접근" ON avatars FOR ALL USING (
  EXISTS (SELECT 1 FROM children c WHERE c.id = avatars.child_id AND c.parent_id = auth.uid())
);
CREATE POLICY "그룹 멤버 아바타 조회" ON avatars FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id
    WHERE g.child_id = avatars.child_id AND gm.user_id = auth.uid()
  )
);

-- stories
CREATE POLICY "그룹 멤버 스토리 조회" ON stories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id
    WHERE g.child_id = stories.child_id AND gm.user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM children c WHERE c.id = stories.child_id AND c.parent_id = auth.uid())
);
CREATE POLICY "인증 사용자 스토리 생성" ON stories FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "보호자 스토리 수정" ON stories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM children c WHERE c.id = stories.child_id AND c.parent_id = auth.uid())
);

-- story_pages (stories와 동일한 그룹 기반)
CREATE POLICY "그룹 멤버 페이지 조회" ON story_pages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM stories s
    WHERE s.id = story_pages.story_id
    AND (
      EXISTS (SELECT 1 FROM children c WHERE c.id = s.child_id AND c.parent_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id
        WHERE g.child_id = s.child_id AND gm.user_id = auth.uid()
      )
    )
  )
);
CREATE POLICY "인증 사용자 페이지 생성" ON story_pages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM stories s WHERE s.id = story_pages.story_id AND s.creator_id = auth.uid())
);
CREATE POLICY "그룹 멤버 페이지 수정" ON story_pages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM stories s
    WHERE s.id = story_pages.story_id
    AND (
      EXISTS (SELECT 1 FROM children c WHERE c.id = s.child_id AND c.parent_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id
        WHERE g.child_id = s.child_id AND gm.user_id = auth.uid()
      )
    )
  )
);

-- story_pool (모든 인증 사용자 읽기)
CREATE POLICY "인증 사용자 풀 조회" ON story_pool FOR SELECT USING (auth.role() = 'authenticated');

-- approvals
CREATE POLICY "관련 사용자 승인 조회" ON approvals FOR SELECT USING (
  auth.uid() = requester_id
  OR EXISTS (
    SELECT 1 FROM stories s JOIN children c ON c.id = s.child_id
    WHERE s.id = approvals.story_id AND c.parent_id = auth.uid()
  )
);
CREATE POLICY "그룹 멤버 승인 요청" ON approvals FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "보호자 승인 처리" ON approvals FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM stories s JOIN children c ON c.id = s.child_id
    WHERE s.id = approvals.story_id AND c.parent_id = auth.uid()
  )
);

-- comments
CREATE POLICY "그룹 멤버 댓글 전체" ON comments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM stories s
    WHERE s.id = comments.story_id
    AND (
      EXISTS (SELECT 1 FROM children c WHERE c.id = s.child_id AND c.parent_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM group_members gm JOIN groups g ON g.id = gm.group_id
        WHERE g.child_id = s.child_id AND gm.user_id = auth.uid()
      )
    )
  )
);
