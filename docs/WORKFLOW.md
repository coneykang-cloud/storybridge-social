# StoryBridge — 전체 워크플로우 마스터 문서

**프로젝트:** StoryBridge MVP v3.0  
**작성자:** 강현정  
**최초 작성:** 2026.06.04 / 최종 업데이트: 2026.06.08  
**상태:** v2 코드 구현 완료 — DB migration 004~013 실행 완료, 협업 그룹 RLS 정상화, 브릿지 책장·AI 제안·스토리 제목/권한 개선, 이미지 생성 파이프라인 Replicate 전환(아바타 일관성 반영), TTS 음성 안내 정상화

---

## 완료된 것 ✅

### 문서
| 문서 | 버전 |
|---|---|
| PRD | v3.4 |
| HLD | v2.4 |
| LLD | v2.5 |
| Plan | v2.4 |
| DesignSpec | v2.4 |
| TDD | v1.4 |

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

---

## 미완료 / 진행 중 🔄

| 항목 | 상태 | 비고 |
|---|---|---|
| `/api/story/[id]/chunking` | ⬜ 미구현 | |
| `story.store.ts` v2 확장 | ⬜ 미구현 | Track 파라미터 포함한 generateStory 인터페이스 업데이트 |
| 모바일 설정 역할 배지 | ⬜ 미확인 | |
| 기존에 잘못 저장된 스토리 데이터 보정 | ⬜ 필요 시 | `/api/story/generate` INSERT가 `track`/`created_by_role`/`presentation_mode`/`therapy_goal_tags` 등을 누락해 모든 AI 생성 스토리가 `track='B'`(보호자) 기본값으로 저장돼 있었음 → 2026-06-08 수정했으나, 수정 이전에 생성된 기존 행들(특히 치료사 생성분)은 여전히 잘못된 배지로 표시됨. 필요하면 일괄 UPDATE 스크립트 작성 |

---

## 다음 작업 우선순위

1. **`/api/story/[id]/chunking` 엔드포인트 구현**

2. **`story.store.ts` v2 확장** — Track 파라미터 포함한 generateStory 인터페이스 업데이트

3. **TTS 단어 하이라이트 동기화 구현** — PRD에 명시된 기능(`읽히는 단어 하이라이트 동기화`)이지만 미완성 상태. 백엔드(`synthesizeKorean`)가 `WordTiming[]`을 계산해 `word_timings`로 응답에 포함하지만 프론트(`StoryViewer.playTTS`)가 이를 무시함. 또한 현재는 일반 텍스트(`input.text`)를 보내고 있어 Google TTS가 `timepoints`를 생성하지 못함 → SSML `<mark>` 태그 삽입 + `v1beta1` 엔드포인트 전환 + 프론트 하이라이트 렌더링까지 별도 구현 필요

4. **(선택) 기존 스토리 데이터 보정** — `track='B'`로 잘못 저장된 기존 AI 생성 스토리들의 `track`/`created_by_role`을 실제 생성자 역할에 맞게 일괄 보정

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
