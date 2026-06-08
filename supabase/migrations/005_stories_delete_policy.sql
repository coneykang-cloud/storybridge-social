-- StoryBridge: stories 테이블에 DELETE RLS 정책 추가
-- 기존에 SELECT/INSERT/UPDATE 정책만 있고 DELETE 정책이 없어
-- 보호자가 삭제 버튼을 눌러도 RLS에 의해 0행이 삭제되는 문제 수정

CREATE POLICY "보호자 스토리 삭제" ON stories FOR DELETE USING (
  EXISTS (SELECT 1 FROM children c WHERE c.id = stories.child_id AND c.parent_id = auth.uid())
);
