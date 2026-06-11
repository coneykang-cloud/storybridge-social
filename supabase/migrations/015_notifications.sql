-- StoryBridge: notifications 테이블
--
-- Track별 협업 승인 플로우의 알림(수정 제안 도착 / 승인·거절 결과)을 영속화한다.
-- 알림 INSERT는 발신자가 수신자 본인이 아닌 경우가 대부분이므로 RLS INSERT 정책은
-- 두지 않고, 서버 라우트에서 createServiceClient()(RLS 우회)로만 생성한다.

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('approval_request', 'approval_result', 'comment')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  story_id    UUID REFERENCES stories(id) ON DELETE CASCADE,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 알림 조회" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "본인 알림 수정" ON notifications FOR UPDATE USING (auth.uid() = user_id);
