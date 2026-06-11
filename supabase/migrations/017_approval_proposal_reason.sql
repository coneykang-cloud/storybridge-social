-- StoryBridge: 수정 제안에 "제안 사유" 추가
--
-- 전문가가 수정 제안을 보낼 때 왜 이렇게 바꾸자고 제안하는지 보호자에게
-- 함께 전달할 수 있도록 approvals 테이블에 사유 컬럼을 추가한다.

ALTER TABLE public.approvals
  ADD COLUMN proposal_reason TEXT;
