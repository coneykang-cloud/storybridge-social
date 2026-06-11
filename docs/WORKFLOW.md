# StoryBridge — 전체 워크플로우 마스터 문서

**프로젝트:** StoryBridge MVP v3.0  
**작성자:** 강현정  
**최초 작성:** 2026.06.04 / 최종 업데이트: 2026.06.11  
**상태:** v2 코드 구현 완료 — DB migration 004~019 실행 완료(016 제외 — 1바이트 손상 파일), 협업 그룹 RLS 정상화, 브릿지 책장·AI 제안·스토리 제목/권한 개선, 이미지 생성 파이프라인 Replicate 전환(아바타 일관성 반영), TTS 음성 안내 정상화 + autoplay 자동재생, PDF 다운로드, 아이(child) 역할 추가, 설정 페이지 계정 정보 통합, **알림 시스템 + 수정 제안 승인 플로우 고도화(StoryPageEditor·DiffViewer·승인 내역 탭) 신규**, 대시보드 승인 배너 다이렉트 이동 버그 수정, Vercel 배포 완료

---

## 완료된 것 ✅

### 문서
| 문서 | 버전 |
|---|---|
| PRD | v3.6 |
| HLD | v2.6 |
| LLD | v2.7 |
| Plan | v2.7 |
| DesignSpec | v2.6 |
| TDD | v1.6 |

### 코드
| 항목 | 상태 |
|---|---|
| Next.js 16.2.7 빌드 성공 | ✅ |
| dev 서버 실행 (localhost:3000) | ✅ |
| 회원가입 / 로그인 (Admin API) | ✅ |
| 루트 리다이렉트 (역할별) | ✅ |
| 대시보드 | ✅ |
| 설정 페이지 (로그아웃, 고대비) | ✅ |
| 아바타 스튜디오 | ✅ |
| 스토리 뷰어 3모드 | ✅ |
| DB v1 마이그레이션 (001, 002) | ✅ Supabase 실행 완료 |
| DB v2 마이그레이션 (003, 004) | ✅ Supabase 실행 완료 (연령대 5구간 반영) |
| DB migration 005 (stories DELETE RLS 정책) | ✅ Supabase 실행 완료 (2026-06-07) — 보호자 본인 스토리 삭제 가능 |
| DB migration 006~008 (행동 관찰 + 공유 접근 RLS) | ✅ Supabase 실행 완료 |
| DB migration 009~012 (groups/group_members RLS 정상화) | ✅ Supabase 실행 완료 (2026-06-07/08) — deny-all 상태였던 RLS를 3차 수정 끝에 정상화 (cross-table 순환 참조 두 건 해결, 최종본 012) |
| DB migration 013 (stories DELETE — 생성자 조건 추가) | ✅ Supabase 실행 완료 (2026-06-08 확인 — 재실행 시 `policy already exists` 에러로 적용 여부 검증) — 치료사 등 creator가 본인 생성 스토리 삭제 가능 |
| **이미지 생성 파이프라인 — Pollinations.ai → Replicate 전환** | ✅ (2026-06-08) — Pollinations가 x402 결제 프로토콜 도입으로 "Queue full for IP" 402 상시 발생 → 사용 불가 판정. `black-forest-labs/flux-schnell`(텍스트→이미지, 장당 ~$0.003, ~0.6초)로 전환 |
| **스토리 페이지 일러스트 — 등록 아바타 기반 캐릭터 일관성** | ✅ (2026-06-08 신규) — 아동의 기본 아바타 이미지가 있으면 `flux-kontext-pro`(이미지 조건부 편집 모델)로 "동일 캐릭터를 새 장면에 배치" 방식 생성 → 페이지마다 얼굴·헤어·옷차림 일관 유지. 아바타 없으면 FLUX Schnell 텍스트 생성으로 폴백 |
| **TTS 읽어주기 기능 정상화** | ✅ (2026-06-08) — ① `GOOGLE_TTS_API_KEY` placeholder → 실제 키 발급 필요(사용자 조치) ② Google TTS REST `v1` API에 존재하지 않는 `enableTimePointing` 필드 제거(모든 요청 400 에러 원인) ③ `tts-cache` 스토리지 버킷에 일반 사용자 INSERT 권한이 없어 업로드가 조용히 실패 → 응답은 "성공"이지만 실제 파일이 없어 브라우저에서 `NotSupportedError` 발생 → service-role 클라이언트로 업로드하도록 수정 (`saveImageBuffer`와 동일 패턴) |
| 스토리 삭제 기능 (DeleteStoryButton, DELETE API) | ✅ |
| 스토리 제목 자동 생성 — 문장형 AI 요약 (gpt-4o-mini, 6WH 기반, 대괄호 메타정보 제거) | ✅ (2026-06-08 개편) |
| 스토리 제목 인라인 수정 (EditableStoryTitle, creator 전용) | ✅ (2026-06-08 신규) |
| `PATCH /api/story/[id]` 권한·필드 제한 (title만, creator만) | ✅ (2026-06-08, 기존엔 누구나 임의 필드 수정 가능했던 보안 구멍 수정) |
| 치료사의 스토리 삭제 버튼 노출 (`isParent \|\| isCreator`) | ✅ (2026-06-08, migration 013과 짝) |
| 대시보드 스토리 썸네일 (첫 페이지 이미지) | ✅ |
| 브릿지 책장 (`/bookshelf`, 전체 스토리 목록 + 트랙 필터) | ✅ (2026-06-08 신규) |
| 협업 그룹 — 초대코드 표시·복사 (`/profile`, InviteCodeBox) | ✅ (2026-06-07 신규) |
| 협업 그룹 — 연결된 아이 전역 표시 (`/profile`, `🔗 연결된 아이` 배지) | ✅ (2026-06-07) |
| AI 대체행동 목표 제안 (SEAT 분석 확장, `replacement_behavior_suggestion`) | ✅ (2026-06-07 신규) |
| TrackA 스토리 생성 — 관찰 데이터 자동 채우기 (raw_input 자동 생성, ABC 순서 정렬) | ✅ (2026-06-07/08, 기존 silent 404 버그 수정 + 섹션 순서 변경) |
| Track A/B/C 생성 페이지 | ✅ |
| ChunkingStrategyPanel | ✅ |
| CumulativeStrip | ✅ |
| TrackBadge | ✅ |
| TherapyGoalTags / SchoolContextTags | ✅ |
| StoryViewer v2 (CumulativeStrip, TrackBadge, homeConnectionMemo) | ✅ |
| SideBar 로그아웃 버튼 | ✅ |
| 스토리 만들기 역할별 자동 분기 | ✅ |
| **사이드바 역할 배지 표시** | ✅ layout.tsx → user_metadata.role → SideBar prop으로 수정 |
| **대시보드 인사말 (profile.full_name)** | ✅ 서버 컴포넌트에서 직접 조회 |
| **app.types.ts v2 전면 개편** | ✅ Track / ChunkingType / PresentationMode / AgeGroup 5구간 |
| **ChildSelectorPanel** | ✅ 모바일 수평 스크롤 + PC 세로 패널 |
| **AGE_GROUP_META / TRACK_META / CHUNKING_TYPE_META 상수** | ✅ |
| **calcAgeGroup() 유틸 함수** | ✅ |

### 코드 — 2026.06.09 추가

| 항목 | 상태 |
|---|---|
| 프로덕션 빌드 타입 에러 5건 + OpenAI 클라이언트 즉시 생성으로 인한 빌드 실패 수정 | ✅ — Vercel 최초 배포 성공(`storybridge-social.vercel.app`) |
| 스토리 PDF 다운로드 기능 (A4 2x2 그리드 레이아웃) | ✅ |
| autoplay 모드에서 TTS 자동 재생 | ✅ |
| 모바일 하단 네비게이션(BottomNavBar)이 항상 숨겨지던 버그 수정 | ✅ |
| 모바일 프로필 페이지 레이아웃 가로 배치로 변경 | ✅ |
| 모바일 ChildSelectorPanel 레이아웃 가로 배치로 변경 | ✅ |
| 설정 페이지 — 내 정보 수정 기능 추가 | ✅ |
| 설정 페이지 — 로그인 계정 정보(이메일/비밀번호 재설정) 추가 | ✅ |
| 설정 페이지 — 정보 카드 통합(이메일/전화번호/역할/비밀번호 한 곳에서 조회) | ✅ |
| `fetchProfile`이 store의 `user`에 의존해 항상 조기 반환되던 버그 수정 | ✅ |
| **아이(child) 역할 추가** — 회원가입 4번째 옵션, migration 014, 미들웨어 경로 보호(`CHILD_ALLOWED`/`CHILD_BLOCKED`), SideBar/BottomNavBar 2개 메뉴 필터링, BookshelfClient `ChildConnectForm` | ✅ |
| 로고를 SVG 대신 실제 이미지(`public/logo.png`)로 교체 | ✅ |

### 코드 — 2026.06.11 추가 (알림 시스템 + 수정 제안 승인 플로우 고도화)

| 항목 | 상태 |
|---|---|
| DB migration 015 (`notifications` 테이블 + RLS) | ✅ Supabase 실행 완료 |
| DB migration 017 (`approvals.proposal_reason TEXT`) | ✅ Supabase 실행 완료 |
| DB migration 018 (`approvals`/`comments`/`notifications`를 `supabase_realtime` publication에 등록) | ✅ Supabase 실행 완료 — 등록 누락 시 `SUBSCRIBED`여도 INSERT 이벤트 미수신되는 버그 해결 |
| DB migration 019 (`notifications.type` CHECK에 `'approval_sent'` 추가) | ✅ Supabase 실행 완료 |
| `notification.store.ts` 신규 (`notifications:{userId}` 채널, `unreadCount`, markAsRead/markAllAsRead) | ✅ |
| `/notifications` 페이지 + `NotificationsClient` (알림 목록, 타입별 아이콘, 클릭 시 이동) | ✅ |
| SideBar/BottomNavBar에 '알림' 메뉴 + `unreadCount` 배지 추가 | ✅ |
| `StoryPageEditor` 신규 — 페이지별 인라인 수정/제안 UI (`canEditDirectly`/`canPropose` 분기, 제안 사유 입력) | ✅ |
| `POST/PATCH /api/approval` — `proposal_reason` 저장 + `notifyUser()`/`summarizeDiff()`로 알림 발송(approval_request/approval_sent/approval_result) | ✅ |
| `ApprovalCard`/`ApprovalHistoryCard`에 스토리 제목 + 페이지 번호 배지(`📖 {제목}·{N}페이지`) 추가 | ✅ |
| `DiffViewer` 신규 — LCS 기반 토큰(단어) 단위 diff로 변경된 단어/구절만 하이라이트 | ✅ |
| '승인 내역' 탭 신규 (`ApprovalHistoryCard`, `collab.store.ts`의 `approvalHistory` 상태) | ✅ |
| **버그 수정:** 대시보드 "승인 대기 N건" 배너가 항상 `/collab`(그룹 목록)로 연결되던 문제 — 대기 승인이 속한 그룹이 하나면 `/collab/{groupId}`로 다이렉트 이동 | ✅ |
| 대시보드 "안 읽은 알림 N건" 배너 신규 (`/notifications` 연결) | ✅ |

### 타입 시스템 (app.types.ts)
| 타입 / 상수 | 내용 |
|---|---|
| `AgeGroup` | `'5-6' \| '7-9' \| '10-12' \| '13-15' \| '16-18'` (5구간) |
| `Track` | `'A' \| 'B' \| 'C'` |
| `ChunkingType` | `'temporal' \| 'spatial' \| 'mixed'` |
| `PresentationMode` | `'cumulative' \| 'sequential'` |
| `TRACK_META` | Track별 라벨/이모지/역할/색상 |
| `AGE_GROUP_META` | 연령대별 라벨/설명 |
| `CHUNKING_TYPE_META` | 청킹 방식별 설명/EF 점수 |
| `PRESENTATION_MODE_META` | 제시 방식별 설명 |
| `calcAgeGroup(birthYear)` | 생년 → AgeGroup 자동 계산 |
| `Approval` (확장, NEW 06.11) | `proposal_reason?`, `story?: { title }`, `page?: { page_number } \| null` 추가 |
| `Notification` (신규, NEW 06.11) | `id`/`user_id`/`type`/`title`/`body`/`story_id`/`is_read`/`created_at` |

---

## 미완료 / 진행 중 🔄

| 항목 | 상태 | 비고 |
|---|---|---|
| `/api/story/[id]/chunking` | ⬜ 미구현 | |
| `story.store.ts` v2 확장 | ⬜ 미구현 | Track 파라미터 포함한 generateStory 인터페이스 업데이트 |
| 모바일 설정 역할 배지 | ⬜ 미확인 | |
| 기존에 잘못 저장된 스토리 데이터 보정 | ⬜ 필요 시 | `/api/story/generate` INSERT가 `track`/`created_by_role`/`presentation_mode`/`therapy_goal_tags` 등을 누락해 모든 AI 생성 스토리가 `track='B'`(보호자) 기본값으로 저장돼 있었음 → 2026-06-08 수정했으나, 수정 이전에 생성된 기존 행들(특히 치료사 생성분)은 여전히 잘못된 배지로 표시됨. 필요하면 일괄 UPDATE 스크립트 작성 |
| TTS 단어 하이라이트 동기화 | ⬜ 미구현 | autoplay 자동재생은 구현됐으나(06.09), 단어별 하이라이트는 여전히 미구현 |
| `notifyUser()` try/catch 미적용 | ⬜ 후속 정리 | `/api/approval` POST/PATCH에서 `notifications` insert 실패 시 승인 처리 자체가 500으로 실패할 수 있음 (TDD §5.6/§15.3) |
| SideBar `pendingCount` prop 죽은 코드 | ⬜ 후속 정리 | `MainLayout`이 값을 계산·전달하지 않아 "승인 대기 N건" 박스가 항상 0 (LLD §3.22) |
| migration 016 손상 파일 | ⚠️ 원인 불명 | `016_user_profiles_group_visibility.sql`이 1바이트("4")로 손상됐으나 cross-user RLS는 정상 동작 — 후속 조사 필요 (LLD §1.6) |
| ApprovalCard `track` 정보 표시 / 승인 내역 Track 구분 | ⬜ 미구현 | v2.7에서 "스토리/페이지 배지" + "승인 내역 탭"으로 대체 구현됐으나 Track 자체 배지·구분은 없음 (Plan §5-3) |
| Track별 "스토리 생성" 알림 분기 (`story:created:trackA/B/C`) | ⬜ 미구현 | HLD §6.2 설계안 — v2.7에서 구현된 것은 승인 제안/처리 알림뿐 |

---

## 다음 작업 우선순위

1. **`/api/story/[id]/chunking` 엔드포인트 구현**

2. **`story.store.ts` v2 확장** — Track 파라미터 포함한 generateStory 인터페이스 업데이트

3. **TTS 단어 하이라이트 동기화 구현** — PRD에 명시된 기능(`읽히는 단어 하이라이트 동기화`)이지만 미완성 상태. 백엔드(`synthesizeKorean`)가 `WordTiming[]`을 계산해 `word_timings`로 응답에 포함하지만 프론트(`StoryViewer.playTTS`)가 이를 무시함. 또한 현재는 일반 텍스트(`input.text`)를 보내고 있어 Google TTS가 `timepoints`를 생성하지 못함 → SSML `<mark>` 태그 삽입 + `v1beta1` 엔드포인트 전환 + 프론트 하이라이트 렌더링까지 별도 구현 필요

4. **(선택) 기존 스토리 데이터 보정** — `track='B'`로 잘못 저장된 기존 AI 생성 스토리들의 `track`/`created_by_role`을 실제 생성자 역할에 맞게 일괄 보정

5. **`notifyUser()` try/catch 보강** — `/api/approval`의 알림 발송 실패가 승인 처리 자체를 500으로 만들지 않도록 분리

6. **SideBar `pendingCount` 정리** — `MainLayout`에서 실제 값을 계산해 전달하거나, 죽은 prop·UI를 제거

---

## 환경 정보

| 항목 | 값 |
|---|---|
| 프로젝트 경로 | `D:\2. 연세대학원\workspace_app\storybridge` |
| Supabase URL | `https://fiuyetdetvvxogzkpoct.supabase.co` |
| 로컬 서버 | `http://localhost:3000` |
| Node.js | v24.16.0 / Next.js 16.2.7 |

## dev 서버 시작
```
cd "D:\2. 연세대학원\workspace_app\storybridge"
npm run dev
```

---

*이 문서는 프로젝트 진행 상황을 추적하는 단일 진실 원천입니다.*
