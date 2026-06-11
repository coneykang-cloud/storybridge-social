-- notifications.type CHECK 제약에 'approval_sent' 추가
-- (제안을 보낸 사람 본인에게 "제안을 보냈어요 (대기중)" 알림을 남기기 위함)

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('approval_request', 'approval_result', 'approval_sent', 'comment'));
