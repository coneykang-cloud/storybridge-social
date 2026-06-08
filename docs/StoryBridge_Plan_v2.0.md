# StoryBridge 구현 계획 (Implementation Plan) v2.0

**버전:** v2.4  
**작성일:** 2026.06.05 / 최종 업데이트: 2026.06.08  
**작성자:** 강현정  
**참조:** PRD v3.4 / HLD v2.4 / LLD v2.5  
**변경 이력:** v1.0 → v2.0 (3-Track 모델, 청킹 2차원화, 누적 제시 UI 반영) / v2.0 → v2.1 (완료 항목 체크, migration 004 추가, 5구간 연령대) / v2.1 → v2.2 (Phase 5에 행동 관찰하기 5-6 태스크 추가) / v2.2 → v2.3 (행동 관찰하기·협업 그룹 항목 완료 처리 및 마이그레이션 007~013 반영, 브릿지 책장·제목 자동생성/인라인 수정·creator 수정삭제 권한 Phase 5-7 신규 추가) / v2.3 → v2.4 (이미지 생성 파이프라인 Replicate 전환·아바타 캐릭터 일관성, TTS 읽어주기 정상화 3건 버그 수정 완료 처리, 아바타 생성 PhotoMaker→DALL·E 2 실제 구현 정정)

---

## 전체 타임라인

```
W1  W2  W3  W4  W5  W6  W7  W8  W9  W10  W11  W12
│──────│  기반 설정 + 디자인 시스템 + DB v2 마이그레이션
      │──────│  인증 + 아동 프로필 + 아바타 스튜디오
            │──────│  AI 파이프라인 (3-Track + 청킹 2차원)
                  │──────│  스토리 뷰어 + TTS + 누적 제시 스트립
                        │──────│  Story Pool + 3-Track 협업/승인
                              │──────────│  QA + 배포 준비
```

---

## Phase 1: W1~2 — 기반 설정 + DB v2 마이그레이션

### 목표
- 프로젝트 기반 환경 (완료 상태 유지)
- **DB v2 마이그레이션 실행** (v3 스키마 반영)
- 신규 타입·상수 정의
- 디자인 시스템 기본 컴포넌트 (완료 상태 유지)

### 태스크 목록

#### 1-1. DB v2 마이그레이션
- [x] `003_v2_schema_update.sql` 작성 및 Supabase 실행 ✅
- [x] `004_age_group_5segments.sql` 작성 완료 ✅ → **Supabase 실행 필요 ⬜**
  - children/story_pool age_group CHECK 제약 5구간으로 변경
  - 기존 데이터 마이그레이션 (10-13→10-12, 14-18→16-18)

#### 1-2. TypeScript 타입 v2 업데이트
- [x] `types/app.types.ts` — `Track`, `ChunkingType`, `PresentationMode` 신규 타입 ✅
- [x] `AgeGroup` 5구간 업데이트 ✅ (`'5-6'|'7-9'|'10-12'|'13-15'|'16-18'`)
- [x] `Story`, `StoryPage`, `GenerateStoryInput` 인터페이스 v2 확장 ✅
- [x] `TRACK_META` (bgClass 포함), `AGE_GROUP_META`, `CHUNKING_TYPE_META`, `PRESENTATION_MODE_META` 상수 ✅
- [x] `calcAgeGroup()` 유틸 함수 ✅

#### 1-3. 기존 완료 항목
- [x] 프로젝트 설정 (tsconfig, tailwind, next.config, postcss) ✅
- [x] Supabase 클라이언트 (client, server, middleware) ✅
- [x] UI 기본 컴포넌트 (Button, Card, Badge, Input) ✅
- [x] 레이아웃 컴포넌트 (BottomNavBar, SideBar + 로그아웃 + 역할 배지) ✅
- [x] 루트 페이지 리다이렉트 ✅

---

## Phase 2: W3~4 — 인증·아동 프로필·아바타 스튜디오

### 목표
- 역할 선택 기반 회원가입 (완료 상태 유지)
- 아동 프로필 CRUD
- 아바타 스튜디오

### 태스크 목록

#### 2-1. 인증 플로우
- [x] 회원가입 Admin API 방식 ✅
- [x] 역할 선택 UI ✅
- [x] 로그인 후 역할별 Track 생성 페이지 자동 분기 ✅

#### 2-2. 아동 프로필
- [x] `/api/children` POST/GET ✅
- [x] `/api/children/[id]` GET/PUT/DELETE ✅
- [x] 온보딩 스텝: 이름, 생년, 관심사, 친숙 환경 ✅
- [x] `child.store.ts` Zustand 스토어 ✅
- [x] `/profile` 페이지 — 아동 프로필 관리 ✅
- [x] `/onboarding/child` 페이지 ✅

#### 2-3. 아바타 스튜디오
- [x] 사진 업로드 + Supabase Storage (`avatars/`) ✅
- [x] 스타일 4종 선택 UI ✅
- [x] `/api/avatar/generate` → OpenAI DALL·E 2 / Dicebear fallback ✅ (★ 2026-06-08 정정: 설계 단계의 "Replicate PhotoMaker"는 실제로 구현되지 않았고, 코드는 DALL·E 2 → Dicebear 2단계 폴백 구조 — TDD §5.5/§7.4)
- [x] `/api/avatar/upload` ✅
- [x] `/api/avatar/status/[id]` 폴링 ✅
- [x] `/api/avatar/[id]` GET/DELETE ✅
- [x] `/api/avatar/[id]/default` 기본 아바타 설정 ✅
- [x] `/avatar-studio` 페이지 + AvatarStudioClient ✅

#### 2-4. 설정 페이지
- [x] 로그아웃 버튼 ✅
- [x] 고대비 모드 토글 ✅
- [x] 역할 배지 표시 (SideBar — MainLayout server component → prop) ✅

---

## Phase 3: W5~6 — AI 파이프라인 (3-Track + 청킹 2차원)

### 목표
- Track A/B/C 입력 UI 구현
- GPT-4o 3-Track 분기 생성 파이프라인
- 청킹 유형 × 제시 방식 파라미터 적용
- 누적 제시 `cumulative_strip_text` 생성

### 태스크 목록

#### 3-1. 신규 컴포넌트 구현

**ChunkingStrategyPanel**
- [x] 청킹 유형 3종 라디오 버튼 (시간적/공간적/혼합⭐) ✅
- [x] 제시 방식 2종 라디오 버튼 (누적⭐/순차) ✅
- [x] 치료사: 수정 가능 (✏️), 보호자/교사: 열람만 (🔒) ✅
- [x] 추천 조합 문구 항상 표시 ✅

**TherapyGoalTags (Track A 전용)**
- [x] 5개 치료 목표 태그 멀티 선택 UI ✅

**SchoolContextTags (Track C 전용)**
- [x] 6개 학교 맥락 태그 멀티 선택 UI ✅

**TrackBadge**
- [x] Track별 아이콘 + 텍스트 + 색상 배지 ✅

**ChildSelectorPanel (v2.1 신규)**
- [x] 아이 목록 수평 스크롤 (모바일) + 세로 패널 (PC) ✅
- [x] 아바타 이미지 + 연령대 라벨 표시 ✅
- [x] `children.length > 1`일 때만 렌더링 ✅

#### 3-2. Track별 생성 페이지

**Track A — `/story/create/therapist`**
- [x] 치료 목표 태그 선택 (TherapyGoalTags) ✅
- [x] 치료사 전용 6WH 가이드 텍스트 ✅
- [x] ChunkingStrategyPanel (수정 가능) ✅
- [x] ChildSelectorPanel 통합 ✅
- [ ] AI 생성 → 인라인 편집 (API v2 연동 예정)

**Track B — `/story/create/parent`**
- [x] 자유 줄글 + 6WH 가이드 (SixWHGuide) ✅
- [x] ChunkingStrategyPanel (열람만) ✅
- [x] ChildSelectorPanel 통합 ✅
- [ ] AI 생성 → 인라인 편집 (API v2 연동 예정)

**Track C — `/story/create/teacher`**
- [x] 학교 맥락 태그 선택 (SchoolContextTags) ✅
- [x] 교사 전용 6WH 가이드 텍스트 ✅
- [x] 가정 연계 메모 입력 (Textarea) ✅
- [x] ChunkingStrategyPanel (열람만) ✅
- [x] ChildSelectorPanel 통합 ✅

**Track 자동 분기**
- [x] `/story/create` 접속 시 role 기반 자동 리다이렉트 ✅

#### 3-3. AI 생성 API v2 업데이트

**`/api/story/generate` 확장**
- [x] Track 파라미터 수신 + 권한 검증 ✅
- [x] `buildTrackSystemPrompt()` 구현 ✅
- [x] `cumulative_strip_text` → DB 저장 ✅
- [x] **버그 수정 (2026-06-08):** INSERT가 `track`/`created_by_role`/`presentation_mode`/`therapy_goal_tags`/`school_context_tags`/`home_connection_memo`/`observation_id` 7개 필드를 누락해 모든 AI 생성 스토리가 `track='B'`(보호자) 기본값으로 저장되던 버그 수정 — 모든 필드 저장 + `created_by_role`을 `TRACK_META[track].role`로 derive ✅
- [x] AI 제목 자동 생성(`generateStoryTitle`) — 본문 생성과 `Promise.all()` 병렬 실행, 문장형 15~25자 요약(2026-06-08 재작성) ✅
- [x] **페이지 일러스트 생성 — Pollinations.ai → Replicate 전환 (2026-06-08)** ✅ — Pollinations가 x402 결제 프로토콜 도입으로 "Queue full for IP" 402가 상시 발생해 사용 불가 판정 → `black-forest-labs/flux-schnell`(텍스트→이미지, 장당 ~$0.003, ~0.6초)로 전환. 페이지별 `for...await` 순차 처리(병렬 아님 — TDD §5.4/§11.2 정정) ✅
- [x] **페이지 일러스트 — 등록 아바타 기반 캐릭터 일관성 (2026-06-08 신규)** ✅ — "등록된 아이 프로필로 이미지를 생성해줬으면 좋겠다" 요청에 따라, 아동 기본 아바타가 있으면 `flux-kontext-pro`(이미지 조건부 편집)로 "동일 캐릭터를 새 장면에 배치" 방식 생성 → 페이지마다 얼굴·헤어·옷차림 일관 유지. 아바타 없으면 FLUX Schnell로 폴백. 워터컬러 스타일 아바타로 end-to-end 검증 완료 (LLD §5.3) ✅

**`/api/story/[id]/chunking` 신규**
- [ ] 치료사 전용 청킹 전략 수정 API ⬜ 미구현

#### 3-4. story.store.ts v2 확장
- [x] `generateStory()` 기본 구조 ✅
- [ ] Track 파라미터 완전 통합 ⬜ 부분 구현

---

## Phase 4: W7~8 — 스토리 뷰어 + TTS + 누적 제시 스트립

### 목표
- 뷰어 3모드 (Manual/AutoPlay/Slideshow)
- TTS 한국어 음성
- **누적 제시 CumulativeStrip UI 구현**
- 뷰어 상단 TrackBadge 표시
- Track C 가정 연계 메모 표시

### 태스크 목록

#### 4-1. CumulativeStrip 컴포넌트
- [x] `cumulative_strip_text` 파싱 → 완료/현재 단계 분리 ✅
- [x] 완료 단계: ✅ + `text-mint-500 opacity-70` ✅
- [x] 현재 단계: ▶ + `font-semibold` + `border-l-2 border-coral-500` ✅
- [x] `presentation_mode = sequential` 또는 `stripText = null` 시 렌더링 없음 ✅

#### 4-2. StoryViewer v2 수정
- [x] props에 `presentationMode`, `track`, `homeConnectionMemo` 추가 ✅
- [x] 각 페이지 하단에 `<CumulativeStrip>` 조건부 렌더링 ✅
- [x] Track C + `homeConnectionMemo` 마지막 페이지 표시 ✅
- [x] TTS 읽어주기 버튼 ✅
- [ ] 뷰어 상단 TrackBadge 표시 ⬜

#### 4-3. TTS 연동
- [x] `/api/tts` GET 라우트 ✅
- [x] Google Cloud TTS Neural2 클라이언트 ✅
- [x] Supabase Storage 캐싱 ✅
- [x] **읽어주기 버튼 정상화 (2026-06-08)** ✅ — 코드는 구현돼 있었으나 3가지 버그로 실제로는 무음이었음: ① `GOOGLE_TTS_API_KEY` placeholder → 실제 키 발급, ② `enableTimePointing` 필드가 Google TTS REST `v1`에 존재하지 않아 모든 요청 400 실패 → 제거, ③ `tts-cache` 버킷에 일반 사용자 INSERT RLS 정책이 없어 업로드가 조용히 실패(`NotSupportedError`) → `createServiceClient()`로 전환. 3건 모두 수정 후 합성→업로드→재생 end-to-end 검증 완료 (TDD §10.3, LLD §2.6)
- [ ] 단어 하이라이트 동기화 ⬜ — `synthesizeKorean`이 `WordTiming[]`을 응답에 포함하지만 일반 텍스트 요청이라 `timepoints`가 항상 `[]`이고 프론트(`StoryViewer.playTTS`)도 미사용. SSML `<mark>` 삽입 + `v1beta1` 전환 + 프론트 렌더링 필요 (다음 작업 우선순위 — WORKFLOW.md 참고)

#### 4-4. 스토리 뷰어 페이지
- [x] `/story/[id]/view` 페이지 ✅
- [ ] 스토리 상세 `/story/[id]` TrackBadge + ChunkingStrategyPanel 표시 ⬜

---

## Phase 5: W9~10 — Story Pool + 3-Track 협업/승인

### 목표
- Story Pool 탐색 (연령대 × 카테고리)
- 3-Track 협업 그룹 알림 분기
- Track별 승인 플로우
- 자문 댓글

### 태스크 목록

#### 5-1. Story Pool
- [ ] Pool 탐색 UI (연령대 × 카테고리 필터) ✅
- [ ] 템플릿 → 아동 프로필 커스터마이징 (GPT-4o)
- [ ] Pool 기반 스토리에도 `chunking_type`, `presentation_mode` 적용

#### 5-2. 3-Track 협업 그룹
- [x] 그룹 자동 생성 (아동 프로필 등록 시 1:1로 생성, 별도 발급 절차 없음 — 실제 구현은 PRD 초안의 "보호자가 발급" 흐름과 다름) ✅
- [x] 초대 코드 표시·복사 (`/profile`, `InviteCodeBox` — 보호자가 확인) ✅
- [x] 초대 코드 입력 → 그룹 참여 (`/api/group`, 치료사·교사가 협업 공간에서 입력) ✅
- [x] groups/group_members RLS 정책 정상화 (마이그레이션 009→010→011→012, deny-all + cross-table 무한 재귀 2종 해결, 최종 `is_group_member()`/`is_child_parent()` `plpgsql SECURITY DEFINER` 헬퍼) ✅
- [x] 협업 그룹 연결된 아이 전역 표시 (`/profile`에서 `parent_id` 필터 제거 → RLS만으로 "내 아이 + 연결된 아이" 모두 조회, "🔗 연결된 아이" 배지) ✅
- [ ] **신규:** Track별 알림 Realtime 이벤트 분기
  - `story:created:trackA` → 보호자 알림
  - `story:created:trackB` → 치료사 알림 (선택적)
  - `story:created:trackC` → 그룹 전체 알림
- [ ] collab.store.ts Track별 알림 처리

#### 5-3. Track별 승인 플로우
- [ ] 치료사/교사 수정 제안 UI ✅
- [ ] ApprovalCard에 `track` 정보 표시
- [ ] 승인 요청 시 `track` 필드 저장
- [ ] 보호자 승인/거절 + 피드백 댓글 ✅
- [ ] 승인 히스토리 Track 구분 표시

#### 5-4. 자문 댓글
- [ ] 스토리/페이지 레벨 댓글 ✅
- [ ] CommentThread 실시간 업데이트 ✅
- [ ] 역할 배지 표시 ✅

#### 5-5. 협업 페이지 v2 수정
- [ ] 탭별 Track 알림 현황 표시
- [ ] Track C 스토리의 경우 "가정 연계 확인" 버튼 추가 (보호자 전용)

#### 5-6. 행동 관찰하기 (ABC 기록) — v2.2 → v2.3 대부분 완료, 범위가 "치료사 전용"에서 "전 역할"로 확대됨

- [x] DB migration 006 (behavior_observations 테이블 + RLS + stories.observation_id FK) ✅ 실행 완료
- [x] DB migration 007 (모든 역할이 작성 가능하도록 `therapist_id`→`recorder_id`/`recorder_role` 일반화) ✅ 실행 완료 (2026-06-08)
- [x] DB migration 008 (그룹 멤버 공유 조회 + 치료사가 타인 기록의 SEAT·대체행동 보강 가능하도록 RLS 확장) ✅ 실행 완료 (2026-06-08)
- [x] `/api/observations` POST — 신규 관찰 기록 ✅
- [x] `/api/observations?child_id=` GET — 아동별 히스토리 조회 ✅
- [x] `/api/observations/[id]/analyze` POST — SEAT AI 분석 + **대체행동 목표 제안**(`replacement_behavior_suggestion`, GPT-4o, "AI 추천 → 치료사 검증" 패턴, 2026-06-07 확장) ✅
- [x] `/api/observations/[id]/story-input` GET — Track A 입력 데이터 변환 (raw_input을 ABC 4-섹션 순서로 재구성, recorder_id 필터 제거 — 2026-06-08 수정) ✅
- [x] `/api/observations/[id]/link` PATCH — 스토리 연결 ✅
- [x] `ObservationForm` 컴포넌트 (A/B/C 텍스트에어리어 + 대체행동 + 환경) ✅
- [x] `SeatSelector` 컴포넌트 (S/E/A/T 4분류 체크박스, AI 자동 추천 + 대체행동 제안 박스 "이 제안 적용하기") ✅
- [x] `ObservationHistory` 컴포넌트 (시계열 카드 + SEAT 배지) ✅
- [x] `StoryLinkButton` 컴포넌트 (관찰 → Track A 생성 CTA) ✅
- [x] `/observations` 페이지 (리스트 + 새 기록 버튼) ✅
- [x] `/observations/new` 페이지 (ObservationForm 신규 입력) ✅
- [x] `/observations/[id]` 페이지 (상세 + SeatSelector + StoryLinkButton + AI 제안 박스) ✅
- [x] Track A 생성 페이지에 "관찰에서 불러오기" 연결 — 자동 입력 채움(silent 404 버그 수정) ✅

#### 5-7. 스토리 제목/권한/책장 — NEW v2.3 (2026-06-08, 사용자 요청 기반)

- [x] `raw_input` 섹션 순서를 ABC 순서(관찰된 도전 상황→문제 행동→현재 결과→대체행동 목표)로 정정 ✅
- [x] AI 제목 자동 생성 — `[메타정보] 키워드형` → 문장형 15~25자 요약으로 재작성, 사용자가 AskUserQuestion에서 "더 긴 문장형 요약 제목" 선택 ✅
- [x] `EditableStoryTitle` — 인라인 제목 수정(creator 전용, 연필 아이콘) ✅
- [x] `PATCH /api/story/[id]` 보안 수정 — 기존엔 누구나 임의 필드 수정 가능했던 구멍을 `title`만/`creator_id` 검증으로 제한 ✅
- [x] 치료사·교사의 본인 생성 스토리 수정/삭제 권한 — `isParent || isCreator`로 노출 조건 확장 ✅
- [x] DB migration 013 (`stories` DELETE RLS에 `creator_id` 조건 추가 — 마이그레이션 005가 놓친 creator 케이스 보강) — ✅ **Supabase 적용 완료 확인 (2026-06-08, 재실행 시 `policy "생성자 스토리 삭제" already exists` 에러로 검증)**
- [x] 스토리 `track`/`created_by_role` 미저장 버그 수정 — `/api/story/generate` INSERT 누락 필드 보강, `TRACK_META[track].role`로 derive ✅
- [x] `/bookshelf` "브릿지 책장 (내 이야기)" 페이지 신규 — RLS-only 전체 스토리 조회 + 트랙 필터 칩, SideBar/BottomNavBar 메뉴 추가, 대시보드 죽은 링크 수정 ✅
- [ ] (선택) 기존에 `track='B'`로 잘못 저장된 스토리 데이터 일괄 보정 스크립트 ⬜ 필요 시

---

## Phase 6: W11~12 — QA + 배포 준비

### 목표
- 반응형 QA (Mobile/Tablet/Desktop)
- 3-Track 시나리오별 E2E 테스트
- 성능 최적화
- Vercel 프로덕션 배포

### 태스크 목록

#### 6-1. 3-Track 시나리오 QA
- [ ] **Track A 시나리오:** 치료사 계정 → Track A 생성 → 가정 활용 요청 → 보호자 확인
- [ ] **Track B 시나리오:** 보호자 계정 → Track B 생성 → 치료사 검토 요청 → 치료사 수정 제안 → 보호자 승인
- [ ] **Track C 시나리오:** 교사 계정 → Track C 생성 → 그룹 공유 → 보호자/치료사 확인
- [ ] **청킹 전략 QA:** 치료사가 chunking_type + presentation_mode 변경 → 뷰어에서 CumulativeStrip 정상 표시 확인

#### 6-2. 누적 제시 UI QA
- [ ] `cumulative_strip_text` 정상 렌더링
- [ ] 완료(✅)/현재(▶) 단계 스타일 확인
- [ ] sequential 모드 시 스트립 미표시 확인
- [ ] 고대비 모드 대응 확인

#### 6-3. 반응형 QA
- [ ] Mobile (360px): 모든 Track 생성 페이지
- [ ] Tablet (768px): 사이드패널 레이아웃
- [ ] Desktop (1280px): 3컬럼 레이아웃
- [ ] ChunkingStrategyPanel 모바일 레이아웃 점검

#### 6-4. 성능 최적화
- [ ] `cumulative_strip_text` 렌더링 최적화 (메모이제이션)
- [ ] Track별 페이지 코드 스플리팅
- [ ] Supabase 쿼리 최적화

#### 6-5. 배포
- [ ] Vercel 환경 변수 설정
- [ ] Supabase 프로덕션 RLS 최종 검증 (청킹 수정 권한 포함)
- [ ] 도메인 연결
- [ ] 모니터링 설정

---

## 의존성 그래프

```
Phase 1 (기반 + DB v2)
    └── Phase 2 (인증·프로필)
            ├── Phase 3 (AI 파이프라인 3-Track) ─── Phase 4 (뷰어·TTS·Cumulative)
            └── Phase 5 (Pool·협업 3-Track)
                        └── Phase 6 (QA·배포)
```

---

## 리스크 및 완화 방안

| 리스크 | 가능성 | 영향 | 완화 |
|---|---|---|---|
| Track 권한 우회 (보호자가 Track A 생성 시도) | 중 | 높 | API 서버에서 role 검증 필수 |
| `cumulative_strip_text` AI 생성 품질 불안정 | 중 | 중 | 재생성 버튼 + 인라인 편집 제공 |
| 청킹 전략 변경 시 기존 페이지 스트립 불일치 | 중 | 중 | 변경 시 전체 페이지 재생성 옵션 제공 |
| Track C 가정 연계 메모 미확인 | 낮 | 낮 | 보호자 확인 완료 버튼 + 알림 리마인더 |
| 3-Track 협업 알림 과다 발송 | 낮 | 중 | 알림 설정 (선택적 ON/OFF) v4에서 적용 |

---

## v1.0 → v2.0 변경 요약

| Phase | 추가/변경 내용 |
|---|---|
| Phase 1 | DB v2 마이그레이션 SQL 작성·실행 태스크 추가; 타입 v2 업데이트 |
| Phase 2 | 역할별 Track 자동 분기 유도 UI 추가 |
| Phase 3 | 전면 재작성: Track A/B/C 페이지 3개 + 5개 신규 컴포넌트 + API v2 확장 |
| Phase 4 | CumulativeStrip 컴포넌트 + StoryViewer v2 수정 + Track 메타 표시 |
| Phase 5 | Track별 협업 알림 분기 + Track C 가정 연계 확인 버튼 |
| Phase 6 | 3-Track 시나리오 QA + 누적 제시 UI QA 추가 |

---

## v2.0 → v2.1 변경 요약 (2026.06.06)

| Phase | 추가/변경 내용 |
|---|---|
| Phase 1 | migration 004 작성 완료 (Supabase 미실행); 타입 v2.1 완성 (5구간, 상수들) |
| Phase 2 | 전체 완료: 인증, 아동 프로필, 아바타 스튜디오, /profile, /avatar-studio, 역할 배지 |
| Phase 3 | Track A/B/C 생성 페이지 완료; ChildSelectorPanel 완료; API v2 연동은 미완 |
| Phase 4 | CumulativeStrip, StoryViewer v2, TTS 완료; TrackBadge 뷰어 표시 미완 |

---

## v2.1 → v2.2 변경 요약 (2026.06.08)

| Phase | 추가/변경 내용 |
|---|---|
| Phase 5 | 5-6 행동 관찰하기 태스크 신규 (migration 006, /api/observations 5개, 컴포넌트 4개, 페이지 3개, Track A 연결 버튼) |

---

## v2.2 → v2.3 변경 요약 (2026.06.08)

| Phase | 추가/변경 내용 |
|---|---|
| Phase 3-3 | `/api/story/generate` Track 처리·`buildTrackSystemPrompt`·cumulative_strip_text 저장을 완료 처리; INSERT 필드 누락 버그(track/created_by_role 등 7개) 수정 이력 및 AI 제목 자동 생성(병렬 실행) 완료 항목 추가 |
| Phase 5-2 | 그룹 흐름을 실제 구현(아동 프로필 등록 시 자동 생성, 보호자가 초대 코드 표시·복사, 치료사·교사가 협업 공간에서 입력)에 맞게 재기술; groups/group_members RLS 정상화(009~012)·연결된 아이 전역 표시 완료 처리 |
| Phase 5-6 | 행동 관찰하기 범위를 "치료사 전용"→"전 역할"로 갱신(migration 007/008); 거의 모든 항목 완료 처리, AI 대체행동 제안·raw_input 매핑 수정·자동 입력 채움 버그 수정 반영 |
| Phase 5-7 (신규) | 스토리 제목/권한/책장 묶음 — raw_input 순서 정정, AI 제목 문장형 재작성+인라인 수정, PATCH 보안 수정, creator 수정·삭제 권한(migration 013, 적용 완료), track/created_by_role 버그 수정, 브릿지 책장 페이지 신규 |

---

## v2.3 → v2.4 변경 요약 (2026.06.08)

| Phase | 추가/변경 내용 |
|---|---|
| Phase 2-3 | 아바타 스튜디오 — `/api/avatar/generate` 항목을 실제 코드(DALL·E 2 → Dicebear 폴백)에 맞게 정정. 설계 단계의 "Replicate PhotoMaker"는 구현되지 않았음을 명시 (TDD §5.5/§7.4) |
| Phase 3-3 (신규) | 페이지 일러스트 생성 파이프라인 전환 2건을 완료 처리로 추가: ① Pollinations.ai → Replicate FLUX Schnell 전환(x402 결제 프로토콜로 서비스 중단), ② 등록 아바타 기반 캐릭터 일관성(`flux-kontext-pro` 분기, 워터컬러 스타일 검증 완료) |
| Phase 4-3 | TTS 항목에 "읽어주기 버튼 정상화(2026-06-08)" 완료 처리 추가 — placeholder API 키, `enableTimePointing` 필드 오류, `tts-cache` storage RLS 누락(silent upload 실패) 3건 버그 수정 이력 명시; 단어 하이라이트 동기화는 여전히 미구현으로 "다음 작업 우선순위"에 등재 |
| Phase 5-7 / migration 013 | "실행 대기" → "Supabase 적용 완료 확인(2026-06-08, SQL Editor 재실행 시 `policy "생성자 스토리 삭제" already exists` 에러로 검증)"으로 상태 정정 |

---

*StoryBridge Plan v2.4 | 2026.06.08*
