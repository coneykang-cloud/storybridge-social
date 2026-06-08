-- StoryBridge Story Pool 시드 데이터
-- 3 연령대 × 2 카테고리 × 3개 = 18개 템플릿

INSERT INTO public.story_pool (age_group, category, title, description, tags, base_pages) VALUES

-- ─────────────────────────────────────────────────────
-- 7~9세 / 학교생활·또래관계 (3개)
-- ─────────────────────────────────────────────────────
('7-9', 'school', '급식 줄 서기',
 '점심시간에 급식실에서 차례를 기다리는 방법을 배워요',
 ARRAY['급식실', '차례', '기다리기'],
 '[
   {"page_type":"intro","descriptive":"나는 학교에서 밥을 먹어요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"점심시간이 되면 친구들이 급식실로 가요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"친구들은 줄을 서서 차례를 기다려요.","perspective":"선생님은 모두가 줄을 서면 더 빨리 밥을 먹을 수 있다고 생각해요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"나도 줄 맨 뒤에 서서 기다려요.","coaching":"나는 차례를 기다릴 수 있어요."},
   {"page_type":"conclusion","descriptive":"차례를 지키면 모두가 행복해요."}
 ]'::jsonb),

('7-9', 'school', '쉬는 시간에 놀이 참여하기',
 '친구들이 하는 놀이에 함께 끼는 방법을 배워요',
 ARRAY['쉬는시간', '놀이', '친구'],
 '[
   {"page_type":"intro","descriptive":"쉬는 시간에 친구들이 운동장에서 놀아요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"나는 친구들이 노는 모습을 바라봐요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"친구에게 다가가서 \"나도 같이 놀 수 있어?\"라고 말해요.","coaching":"나는 친구에게 먼저 말을 걸 수 있어요."},
   {"page_type":"body","chunking_label":"마지막으로","descriptive":"친구들이 \"그래!\"라고 말하면 함께 놀아요.","perspective":"친구들은 나와 함께 놀면 더 즐거울 거예요."},
   {"page_type":"conclusion","descriptive":"함께 노는 것은 즐거워요."}
 ]'::jsonb),

('7-9', 'school', '선생님께 도움 요청하기',
 '모를 때 선생님께 손을 들고 여쭤보는 방법을 배워요',
 ARRAY['수업', '선생님', '질문'],
 '[
   {"page_type":"intro","descriptive":"수업 시간에 모르는 것이 생길 때가 있어요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"나는 손을 번쩍 들어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"선생님이 나를 보면 \"선생님, 잘 모르겠어요\"라고 말해요.","coaching":"나는 도움을 요청할 수 있어요."},
   {"page_type":"body","chunking_label":"마지막으로","descriptive":"선생님이 친절하게 설명해 주세요.","perspective":"선생님은 내가 질문하면 기뻐해요."},
   {"page_type":"conclusion","descriptive":"모를 때 물어보면 더 잘 알게 돼요."}
 ]'::jsonb),

-- ─────────────────────────────────────────────────────
-- 7~9세 / 일상생활·감정조절 (3개)
-- ─────────────────────────────────────────────────────
('7-9', 'daily', '화가 날 때 멈추기',
 '화가 났을 때 잠깐 멈추고 숨을 쉬는 방법을 배워요',
 ARRAY['감정조절', '화', '호흡'],
 '[
   {"page_type":"intro","descriptive":"때로는 화가 나는 일이 생겨요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"화가 날 때 나는 멈춰요.","coaching":"나는 멈출 수 있어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"코로 숨을 크게 들이쉬어요. 하나, 둘, 셋."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"입으로 천천히 내쉬어요.","perspective":"숨을 쉬면 마음이 조금 나아질 거예요."},
   {"page_type":"conclusion","descriptive":"멈추고 숨을 쉬면 기분이 나아져요."}
 ]'::jsonb),

('7-9', 'daily', '물건 정리하기',
 '놀고 난 뒤 장난감을 제자리에 놓는 방법을 배워요',
 ARRAY['정리정돈', '루틴', '집'],
 '[
   {"page_type":"intro","descriptive":"놀고 나면 정리할 시간이에요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"나는 놀던 장난감을 바라봐요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"장난감을 하나씩 제자리에 넣어요.","coaching":"나는 정리할 수 있어요."},
   {"page_type":"body","chunking_label":"마지막으로","descriptive":"방이 깨끗해졌어요.","perspective":"엄마 아빠는 깔끔한 방을 보면 기뻐해요."},
   {"page_type":"conclusion","descriptive":"정리하면 기분이 좋아요."}
 ]'::jsonb),

('7-9', 'daily', '새로운 장소 가기',
 '처음 가는 곳에서 차분하게 있는 방법을 배워요',
 ARRAY['새로운환경', '적응', '불안'],
 '[
   {"page_type":"intro","descriptive":"오늘은 처음 가는 곳에 가요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"새로운 곳에 도착하면 주변을 둘러봐요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"엄마 아빠 옆에 있으면 안전해요.","perspective":"엄마 아빠는 항상 나와 함께 있어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"괜찮다고 느껴지면 조금씩 살펴봐요.","coaching":"나는 새로운 곳에서도 괜찮을 수 있어요."},
   {"page_type":"conclusion","descriptive":"새로운 곳도 곧 친숙해져요."}
 ]'::jsonb),

-- ─────────────────────────────────────────────────────
-- 10~13세 / 학교생활·또래관계 (3개)
-- ─────────────────────────────────────────────────────
('10-13', 'school', '발표하기',
 '수업 시간에 자신있게 발표하는 방법을 배워요',
 ARRAY['발표', '자신감', '수업'],
 '[
   {"page_type":"intro","descriptive":"선생님이 발표할 사람을 물어볼 때가 있어요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"내가 아는 내용이면 손을 들어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"선생님이 나를 지목하면 자리에서 일어나요.","coaching":"나는 크고 또렷한 목소리로 말할 수 있어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"틀려도 괜찮아요. 모두가 배우는 중이에요.","perspective":"선생님과 친구들은 내가 용기를 내는 것을 응원해요."},
   {"page_type":"conclusion","descriptive":"발표를 해보면 다음에는 더 쉬워요."}
 ]'::jsonb),

('10-13', 'school', '친구에게 먼저 말 걸기',
 '새 친구나 아는 친구에게 먼저 대화를 시작하는 방법을 배워요',
 ARRAY['대화시작', '친구', '관계'],
 '[
   {"page_type":"intro","descriptive":"친구와 이야기하고 싶을 때가 있어요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"친구 가까이 다가가요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"\"안녕\"이라고 말하거나 친구가 하는 것에 대해 물어봐요.","coaching":"나는 \"그거 재미있어 보여, 뭐야?\" 같이 말할 수 있어요."},
   {"page_type":"body","chunking_label":"마지막으로","descriptive":"친구가 대답하면 잘 들어요.","perspective":"친구는 내가 관심을 보여주면 기뻐할 거예요."},
   {"page_type":"conclusion","descriptive":"먼저 말을 걸면 친구가 될 수 있어요."}
 ]'::jsonb),

('10-13', 'school', '모둠 활동 참여하기',
 '그룹 과제에서 내 의견을 말하고 협력하는 방법을 배워요',
 ARRAY['그룹활동', '협력', '의견'],
 '[
   {"page_type":"intro","descriptive":"선생님이 모둠 활동을 시작해요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"모둠 친구들이 각자 아이디어를 말해요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"내 차례가 되면 내 생각을 말해요.","coaching":"나는 \"저는 이렇게 생각해요\"라고 말할 수 있어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"친구의 의견도 끝까지 들어요.","perspective":"친구들은 서로 의견을 나눌 때 더 좋은 결과가 나온다고 생각해요."},
   {"page_type":"conclusion","descriptive":"함께 하면 더 좋은 결과가 나와요."}
 ]'::jsonb),

-- ─────────────────────────────────────────────────────
-- 10~13세 / 일상생활·감정조절 (3개)
-- ─────────────────────────────────────────────────────
('10-13', 'daily', '실수했을 때 대처하기',
 '실수를 했을 때 당황하지 않고 대처하는 방법을 배워요',
 ARRAY['실수', '대처', '자기조절'],
 '[
   {"page_type":"intro","descriptive":"누구나 실수를 할 때가 있어요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"실수를 했을 때 잠깐 멈춰요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"\"괜찮아, 다시 해볼 수 있어\"라고 스스로에게 말해요.","coaching":"나는 실수 후 다시 시도할 수 있어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"필요하면 도움을 요청해요.","perspective":"선생님과 친구들도 모두 실수하며 배워요."},
   {"page_type":"conclusion","descriptive":"실수는 배움의 기회예요."}
 ]'::jsonb),

('10-13', 'daily', '루틴 변화 받아들이기',
 '평소와 다른 일정이 생겼을 때 유연하게 대처하는 방법을 배워요',
 ARRAY['루틴변화', '유연성', '적응'],
 '[
   {"page_type":"intro","descriptive":"오늘은 평소와 다른 일이 있어요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"변화를 알게 되면 마음이 불안할 수 있어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"숨을 크게 쉬고 \"괜찮아, 달라도 돼\"라고 생각해요.","coaching":"나는 변화를 받아들일 수 있어요."},
   {"page_type":"body","chunking_label":"마지막으로","descriptive":"새로운 일정에 따라 행동해요.","perspective":"변화는 때때로 새롭고 재미있는 경험이 돼요."},
   {"page_type":"conclusion","descriptive":"변화는 항상 나쁜 게 아니에요."}
 ]'::jsonb),

('10-13', 'daily', '차례 기다리기',
 '순서를 기다려야 하는 상황에서 인내하는 방법을 배워요',
 ARRAY['기다리기', '인내', '순서'],
 '[
   {"page_type":"intro","descriptive":"기다려야 할 때가 있어요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"내 순서가 아직 아니에요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"기다리는 동안 다른 것을 생각하거나 조용히 기다려요.","coaching":"나는 차분하게 기다릴 수 있어요."},
   {"page_type":"body","chunking_label":"마지막으로","descriptive":"드디어 내 차례가 왔어요.","perspective":"모두가 기다리면 더 공평해요."},
   {"page_type":"conclusion","descriptive":"기다리면 반드시 내 차례가 와요."}
 ]'::jsonb),

-- ─────────────────────────────────────────────────────
-- 14~18세 / 학교생활·또래관계 (3개)
-- ─────────────────────────────────────────────────────
('14-18', 'school', '그룹 과제에서 의견 말하기',
 '모둠 과제에서 자신의 의견을 명확하게 전달하는 방법을 배워요',
 ARRAY['그룹과제', '의사소통', '협업'],
 '[
   {"page_type":"intro","descriptive":"모둠 과제를 진행할 때 내 의견을 말해야 해요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"내 생각을 먼저 정리해요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"\"제 생각에는...\"으로 시작하면 자연스럽게 말할 수 있어요.","coaching":"나는 내 의견을 논리적으로 말할 수 있어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"다른 사람의 의견도 경청하고 존중해요.","perspective":"팀원들은 서로 다른 관점을 나눌 때 더 좋은 결과를 만들어요."},
   {"page_type":"conclusion","descriptive":"나의 의견은 팀에 가치 있는 기여예요."}
 ]'::jsonb),

('14-18', 'school', '갈등 상황에서 감정 표현하기',
 '친구와 갈등이 생겼을 때 감정을 건강하게 표현하는 방법을 배워요',
 ARRAY['갈등', '감정표현', '대화'],
 '[
   {"page_type":"intro","descriptive":"친구와 의견이 달라 갈등이 생길 때가 있어요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"화가 나거나 속상한 감정을 알아차려요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"\"나는 지금 속상해. 왜냐면...\"처럼 나의 감정을 말해요.","coaching":"나는 공격하지 않고 내 감정을 표현할 수 있어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"상대방의 이야기도 끝까지 들어요.","perspective":"서로 감정을 표현하고 들으면 오해가 풀릴 수 있어요."},
   {"page_type":"conclusion","descriptive":"감정을 솔직하게 표현하면 관계가 깊어져요."}
 ]'::jsonb),

('14-18', 'school', '다른 의견 수용하기',
 '내 생각과 다른 의견을 열린 마음으로 받아들이는 방법을 배워요',
 ARRAY['의견차이', '수용', '존중'],
 '[
   {"page_type":"intro","descriptive":"때로는 내 생각과 다른 의견을 듣게 돼요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"다른 의견을 들으면 잠깐 멈추고 들어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"\"왜 그렇게 생각하는지\" 물어볼 수 있어요.","coaching":"나는 다른 의견에 \"그런 생각도 있군요\"라고 말할 수 있어요."},
   {"page_type":"body","chunking_label":"마지막으로","descriptive":"동의하지 않아도 존중할 수 있어요.","perspective":"서로 다른 생각이 있어야 더 좋은 결론을 찾을 수 있어요."},
   {"page_type":"conclusion","descriptive":"다양한 의견이 세상을 더 풍요롭게 해요."}
 ]'::jsonb),

-- ─────────────────────────────────────────────────────
-- 14~18세 / 일상생활·감정조절 (3개)
-- ─────────────────────────────────────────────────────
('14-18', 'daily', '스트레스 조절 전략',
 '스트레스를 느낄 때 건강하게 해소하는 방법을 배워요',
 ARRAY['스트레스', '자기관리', '해소'],
 '[
   {"page_type":"intro","descriptive":"시험이나 어려운 상황에서 스트레스를 받을 수 있어요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"스트레스를 느끼고 있다는 것을 알아차려요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"내가 좋아하는 활동(산책, 음악 듣기, 그림 그리기)을 해요.","coaching":"나는 스트레스를 건강한 방법으로 풀 수 있어요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"필요하면 신뢰하는 사람에게 이야기해요.","perspective":"주변 사람들은 내가 힘들 때 도와주고 싶어해요."},
   {"page_type":"conclusion","descriptive":"스트레스는 적절히 관리하면 극복할 수 있어요."}
 ]'::jsonb),

('14-18', 'daily', '사과하고 화해하기',
 '실수나 갈등 후 진심으로 사과하고 관계를 회복하는 방법을 배워요',
 ARRAY['사과', '화해', '관계회복'],
 '[
   {"page_type":"intro","descriptive":"내가 실수해서 상대방에게 상처를 준 것 같아요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"내가 무엇을 잘못했는지 생각해봐요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"\"미안해, 내가 잘못했어\"라고 진심으로 말해요.","coaching":"나는 진심 어린 사과를 할 수 있어요."},
   {"page_type":"body","chunking_label":"마지막으로","descriptive":"앞으로 어떻게 하겠다고 이야기해요.","perspective":"상대방은 진심 어린 사과를 받으면 마음이 풀릴 거예요."},
   {"page_type":"conclusion","descriptive":"사과는 관계를 더 단단하게 만들어요."}
 ]'::jsonb),

('14-18', 'daily', '감정 일기 쓰기',
 '하루를 돌아보며 감정을 글로 정리하는 방법을 배워요',
 ARRAY['감정일기', '자기성찰', '루틴'],
 '[
   {"page_type":"intro","descriptive":"하루가 끝날 때 오늘 있었던 일을 돌아봐요."},
   {"page_type":"body","chunking_label":"먼저","descriptive":"오늘 나에게 어떤 일이 있었는지 떠올려요."},
   {"page_type":"body","chunking_label":"그 다음","descriptive":"그 때 내 감정이 어땠는지 적어요.","coaching":"나는 \"오늘 나는 ___할 때 ___했다\" 처럼 적을 수 있어요."},
   {"page_type":"body","chunking_label":"마지막으로","descriptive":"내일 해보고 싶은 것도 적어요.","perspective":"감정을 기록하면 나를 더 잘 이해할 수 있어요."},
   {"page_type":"conclusion","descriptive":"감정 일기는 나를 이해하는 좋은 방법이에요."}
 ]'::jsonb);
