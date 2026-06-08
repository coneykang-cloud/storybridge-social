-- StoryBridge: stories DELETE 정책에 "생성자" 조건 추가
--
-- 기존 "보호자 스토리 삭제"(005) 정책은 child의 parent_id만 확인하므로,
-- 치료사가 만든 스토리(creator_id = 치료사)는 API 권한 체크를 통과해도
-- RLS에서 0행이 삭제되어 "삭제 버튼을 눌러도 삭제가 안 되는" 문제가 발생함.
-- (permissive 정책은 OR로 합쳐지므로 기존 정책과 충돌 없이 추가됨)

CREATE POLICY "생성자 스토리 삭제" ON public.stories FOR DELETE USING (
  creator_id = auth.uid()
);
