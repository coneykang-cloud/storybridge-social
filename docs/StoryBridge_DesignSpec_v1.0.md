# StoryBridge 디자인 명세 (PPT/UI Design Spec)

**버전:** v1.0  
**작성일:** 2026.06.04  
**작성자:** 강현정  
**목적:** PPT 제작 및 UI 구현의 단일 기준 문서

---

## 목차

1. [브랜드 아이덴티티](#1-브랜드-아이덴티티)
2. [컬러 시스템](#2-컬러-시스템)
3. [타이포그래피](#3-타이포그래피)
4. [컴포넌트 명세](#4-컴포넌트-명세)
5. [화면별 레이아웃](#5-화면별-레이아웃)
6. [PPT 슬라이드 구조](#6-ppt-슬라이드-구조)
7. [아이콘 및 일러스트](#7-아이콘-및-일러스트)
8. [모션 및 인터랙션](#8-모션-및-인터랙션)

---

## 1. 브랜드 아이덴티티

### 브랜드 컨셉
> **"따뜻하고 안전한 이야기 공간"**  
> ASD 아동부터 치료 전문가까지 모두가 편안하게 사용할 수 있는  
> 친근하고 신뢰감 있는 인터페이스

### 로고 타입
```
StoryBridge
스토리브릿지

서체: Pretendard SemiBold
색상: Deep Charcoal (#2C2C2A) + Soft Mint (#A8D8D8) 강조
아이콘: 두 사람이 다리(bridge) 위에서 이야기를 나누는 심플 라인 아이콘
```

### 슬로건
> "우리 아이의 이야기, 함께 만들어요"

### 브랜드 키워드
- 따뜻함 (Warmth)
- 신뢰 (Trust)
- 개인화 (Personalization)
- 연결 (Connection)
- 접근성 (Accessibility)

---

## 2. 컬러 시스템

### 주요 색상 팔레트

| 이름 | 역할 | HEX | 사용처 |
|---|---|---|---|
| **Soft Mint** | Primary | `#A8D8D8` | 주요 버튼, 강조 요소, 링크 |
| **Lavender** | Secondary | `#C9B8E8` | 배지, 카드 테두리, 보조 강조 |
| **Warm Ivory** | Background | `#FAF8F3` | 앱 기본 배경 |
| **Deep Charcoal** | Text Primary | `#2C2C2A` | 기본 본문 텍스트 |
| **Coral Accent** | CTA / 강조 | `#F08060` | CTA 버튼, 알림 배지 |
| **Success Green** | 성공 | `#5BAD8F` | 승인, 완료, 성공 상태 |
| **Warning Amber** | 경고 | `#F0B030` | 대기, 주의, 경고 |
| **Light Mint** | Surface | `#E8F5F5` | 카드 배경, 입력 필드 배경 |
| **Soft Gray** | Disabled | `#B0B0A8` | 비활성 요소 |
| **White** | Surface | `#FFFFFF` | 카드, 모달 배경 |

### 역할별 색상 배지

| 역할 | 배경색 | 텍스트색 |
|---|---|---|
| 보호자 (Parent) | `#A8D8D8` (Soft Mint) | `#2C2C2A` |
| 치료사 (Therapist) | `#C9B8E8` (Lavender) | `#2C2C2A` |
| 선생님 (Teacher) | `#FDE8C8` (Peach) | `#2C2C2A` |

### 고대비 모드 (Accessibility)

| 요소 | 일반 | 고대비 |
|---|---|---|
| 배경 | `#FAF8F3` | `#FFFFFF` |
| 텍스트 | `#2C2C2A` | `#000000` |
| 버튼 테두리 | 없음 | 2px `#000000` |
| 강조색 | `#A8D8D8` | `#007070` |

### Tailwind 확장 설정
```typescript
// tailwind.config.ts
colors: {
  mint: {
    50:  '#F0FAFA',
    100: '#E8F5F5',
    200: '#C8EAEA',
    300: '#A8D8D8',   // Primary
    400: '#88C8C8',
    500: '#68B8B8',
    600: '#489898',
    700: '#307878',
  },
  lavender: {
    100: '#EDE8F8',
    200: '#DDD0F0',
    300: '#C9B8E8',   // Secondary
    400: '#B5A0E0',
  },
  coral: {
    300: '#F8A888',
    400: '#F49070',
    500: '#F08060',   // CTA
    600: '#E86840',
  },
  ivory: '#FAF8F3',
  charcoal: '#2C2C2A',
  'success-green': '#5BAD8F',
  'warning-amber': '#F0B030',
}
```

---

## 3. 타이포그래피

### 폰트 패밀리
**Pretendard** (한국어 최적화 고딕체)  
CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css`

### 타입 스케일

| 토큰명 | 폰트 | 크기 | 행간 | 자간 | 사용처 |
|---|---|---|---|---|---|
| `display-lg` | SemiBold 700 | 32px | 1.3 | -0.02em | 온보딩 타이틀 |
| `display-md` | SemiBold 700 | 28px | 1.3 | -0.02em | 페이지 제목 |
| `heading-lg` | SemiBold 600 | 24px | 1.4 | -0.01em | 섹션 제목 |
| `heading-md` | Medium 500 | 20px | 1.4 | 0 | 카드 제목 |
| `heading-sm` | Medium 500 | 18px | 1.4 | 0 | 소제목 |
| `body-lg` | Regular 400 | 18px | 1.6 | 0 | 뷰어 본문 (7~9세) |
| `body-md` | Regular 400 | 16px | 1.6 | 0 | 일반 본문 |
| `body-sm` | Regular 400 | 14px | 1.5 | 0 | 보조 텍스트 |
| `label-md` | Medium 500 | 16px | 1.4 | 0.01em | 버튼, 라벨 |
| `label-sm` | Medium 500 | 13px | 1.3 | 0.02em | 배지, 태그 |
| `caption` | Regular 400 | 12px | 1.4 | 0.01em | 타임스탬프, 힌트 |

### 뷰어 연령별 폰트 크기

| 연령대 | 크기 | 폰트 |
|---|---|---|
| 7~9세 | 24px | Pretendard Medium |
| 10~13세 | 20px | Pretendard Regular |
| 14~18세 | 18px | Pretendard Regular |

---

## 4. 컴포넌트 명세

### 4.1 Button

```
[Primary Button]
배경: Soft Mint (#A8D8D8)
텍스트: Deep Charcoal (#2C2C2A), Medium 16px
패딩: 14px 24px
모서리: 12px
최소 높이: 48px
호버: darken 10% (#88C8C8)
비활성: Soft Gray (#B0B0A8) 배경

[CTA Button] — "스토리 만들기 ✨", "아바타 생성"
배경: Coral Accent (#F08060)
텍스트: White, SemiBold 16px
그림자: 0 4px 12px rgba(240,128,96,0.3)

[Ghost Button]
배경: transparent
테두리: 1.5px Soft Mint
텍스트: Soft Mint

[Danger Button]
배경: #E84040
텍스트: White
```

### 4.2 Card

```
배경: #FFFFFF
모서리: 16px
그림자: 0 2px 12px rgba(44,44,42,0.08)
패딩: 20px
테두리: 1px #F0EDE8 (선택적)

[Story Card — 홈 대시보드]
너비: 전체 (모바일) / 반응형
이미지 영역: 16:9, top radius 16px
제목: Heading-md
부제: Body-sm, Soft Gray
상태 배지: 우상단

[Avatar Card — 아바타 라이브러리]
1:1 비율 이미지
스타일 배지: 하단
기본 설정 표시: 민트 체크 오버레이
```

### 4.3 Navigation

```
[모바일 하단 네비게이션 — BottomNavBar]
높이: 64px (+ safe-area-inset-bottom)
배경: #FFFFFF
상단 테두리: 1px #F0EDE8
아이템: 5개 균등 배치

탭 목록:
  🏠 홈         /dashboard
  📖 스토리 만들기  /story/create
  🎨 아바타      /avatar-studio
  👥 협업        /collab
  ⚙️ 설정        /settings

활성 탭: Soft Mint 색상 + 텍스트 표시
비활성 탭: Soft Gray 아이콘만

[태블릿/데스크톱 사이드바 — SideBar]
너비: 240px
배경: #FFFFFF
오른쪽 테두리: 1px #F0EDE8
로고: 상단 20px
메뉴 아이템: 48px 높이, 16px 패딩
활성: Soft Mint 배경 (#E8F5F5), 민트 텍스트
```

### 4.4 Story Viewer

```
[페이지 레이아웃]
전체 화면 또는 카드 (모드에 따라)

이미지 영역:
  모바일: 화면 상단 50%
  태블릿+: 좌측 40%

텍스트 영역:
  설명문: Body-lg, Deep Charcoal
  조망문: Body-lg, Lavender 배경 박스 (#EDE8F8)
  지시문: Body-lg, Mint 배경 박스 (#E8F5F5), ✅ 아이콘

청킹 표지어:
  배경: Coral Accent (#F08060)
  텍스트: White, Label-md
  위치: 페이지 상단

페이지 인디케이터:
  점(dot) 방식, 현재 페이지 Soft Mint

[고대비 모드]
배경: #FFFFFF
텍스트: #000000
박스: 테두리 2px #000000
```

### 4.5 입력 컴포넌트

```
[텍스트에어리어 — 자유 줄글 입력]
배경: #FFFFFF
테두리: 1.5px #D8D5D0 → 포커스 시 Soft Mint
모서리: 12px
패딩: 16px
폰트: Body-md
최소 높이: 160px
플레이스홀더: Soft Gray

[6WH 가이드 패널]
배경: #F5FBF8 (연한 민트)
테두리: 1.5px #A8D8D8
모서리: 12px
각 항목 높이: 44px
아이콘: 24px Tabler Icons
```

---

## 5. 화면별 레이아웃

### 5.1 온보딩 — 역할 선택

```
┌──────────────────────────────┐
│                              │
│   [로고]                     │
│   StoryBridge                │
│                              │
│   안녕하세요! 👋              │
│   어떤 분이신가요?            │
│                              │
│  ┌──────────────────────┐    │
│  │ 🧑‍👧 보호자          │    │← Coral CTA 배경
│  │  아이의 부모/양육자   │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ 🩺 치료사            │    │← Ghost 버튼
│  │  언어/행동 치료사     │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ 👩‍🏫 선생님          │    │← Ghost 버튼
│  │  특수교사/일반교사    │    │
│  └──────────────────────┘    │
│                              │
│   이미 계정이 있으신가요?      │
│   [로그인하기]                │
│                              │
└──────────────────────────────┘
```

### 5.2 홈 대시보드

```
┌──────────────────────────────┐
│ StoryBridge    🔔(2)  👤    │← 헤더
├──────────────────────────────┤
│ 안녕하세요, 민준 엄마님! 👋  │
│ 오늘도 함께 이야기 만들어요  │
│                              │
│ ── 최근 스토리 ─────────────  │
│ ┌──────────┐ ┌──────────┐   │
│ │ [이미지] │ │ [이미지] │   │
│ │ 급식 줄  │ │ 화날 때  │   │
│ │ 서기     │ │ 멈추기   │   │
│ │ 3일 전   │ │ 1주 전   │   │
│ └──────────┘ └──────────┘   │
│                              │
│ ── 승인 대기 ─────────────── │← 보호자 전용
│ ┌──────────────────────────┐ │
│ │ 🔴 치료사 김선생님의     │ │
│ │    수정 제안 1건         │ │
│ │    [확인하기 →]          │ │
│ └──────────────────────────┘ │
│                              │
│ [+ 새 스토리 만들기]          │← CTA 고정 버튼
├──────────────────────────────┤
│ 🏠   📖   🎨   👥   ⚙️     │← 하단 네비
└──────────────────────────────┘
```

### 5.3 스토리 만들기 — AI 생성

```
┌──────────────────────────────┐
│ ← 스토리 만들기              │
├──────────────────────────────┤
│                              │
│ 우리 아이에게 어떤 이야기가   │
│ 필요한가요?                  │
│                              │
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │ (자유롭게 적어주세요)     │ │
│ │                          │ │
│ │                          │ │
│ └──────────────────────────┘ │
│                              │
│ ✅ 이런 내용이 있으면 더 좋아요│
│ ┌──────────────────────────┐ │
│ │ 👤 누가   ⏰ 언제        │ │
│ │ 📍 어디서  💬 무엇을     │ │
│ │ ✋ 어떻게  ❤️ 왜         │ │
│ └──────────────────────────┘ │
│                              │
│ 💡 예시 선택:                │
│ [또래갈등] [감정조절]         │
│ [일상전환] [새환경]           │
│                              │
│ 청킹 방식:                   │
│ ◉ 시간적  ○ 공간적  ○ 혼합  │
│                              │
│ [스토리 만들기 ✨]            │← Coral CTA
│                              │
└──────────────────────────────┘
```

### 5.4 스토리 뷰어

```
┌──────────────────────────────┐
│ ← 급식 줄 서기    📤  ⋯    │
├──────────────────────────────┤
│                              │
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │   [민준이 아바타 이미지]  │ │
│ │   줄 서는 모습            │ │
│ │                          │ │
│ └──────────────────────────┘ │
│                              │
│ 먼저                         │← 청킹 표지어
│                              │
│ 점심시간에 급식실에서         │← 설명문
│ 친구들은 차례로 줄을 서서     │
│ 밥을 받아요.                 │
│                              │
│ ┌──────────────────────────┐ │
│ │ 선생님과 친구들은 모두가   │← 조망문
│ │ 기다리면 더 빨리 밥을     │  (라벤더 박스)
│ │ 먹을 수 있다고 생각해요.  │
│ └──────────────────────────┘ │
│                              │
│ ●●○○○○○○○   3 / 8          │← 페이지 인디케이터
│                              │
│  ◀    [▶ 읽어주기]    ▶     │← 컨트롤
├──────────────────────────────┤
│ 🏠   📖   🎨   👥   ⚙️     │
└──────────────────────────────┘
```

### 5.5 아바타 스튜디오

```
┌──────────────────────────────┐
│ ← 아바타 스튜디오            │
├──────────────────────────────┤
│ 민준이의 아바타 만들기        │
│                              │
│ STEP 1. 사진 업로드           │
│ ┌──────────────────────────┐ │
│ │  📸                      │ │
│ │  사진을 올려주세요        │ │
│ │  (얼굴이 잘 보이는 사진)  │ │
│ └──────────────────────────┘ │
│                              │
│ STEP 2. 스타일 선택           │
│ ┌────────┐ ┌────────┐        │
│ │ 🎨     │ │ 🪞     │        │
│ │ 지브리풍│ │사진닮은꼴│      │
│ └────────┘ └────────┘        │
│ ┌────────┐ ┌────────┐        │
│ │ 🎬     │ │ 🖌️    │        │
│ │ 픽사풍  │ │ 수채화  │       │
│ └────────┘ └────────┘        │
│                              │
│ 현재 아바타 (2/5)            │
│ ┌────┐ ┌────┐ ┌────┐        │
│ │ 👦 │ │ 👦 │ │ +  │        │
│ └────┘ └────┘ └────┘        │
│                              │
│ [아바타 만들기 ✨]            │
└──────────────────────────────┘
```

---

## 6. PPT 슬라이드 구조

### StoryBridge 발표 PPT 구성 (15슬라이드)

| # | 슬라이드 제목 | 핵심 내용 | 비주얼 요소 |
|---|---|---|---|
| 1 | **타이틀** | StoryBridge 로고, 슬로건 | 로고 + 민트/코럴 그라디언트 배경 |
| 2 | **문제 정의** | 3가지 구조적 한계 | 아이콘 3개 + 통계 숫자 |
| 3 | **이론적 근거** | 5가지 학술 이론 | 연결 다이어그램 |
| 4 | **솔루션 개요** | 4대 핵심 가치 제안 | 아이콘 카드 4개 |
| 5 | **타겟 페르소나** | 4 사용자 그룹 | 페르소나 카드 |
| 6 | **정보 구조 (IA)** | 앱 구조 트리 | 시각적 IA 다이어그램 |
| 7 | **핵심 기능 1: 아바타 스튜디오** | 4가지 스타일 | 아바타 스타일 비교 |
| 8 | **핵심 기능 2: AI 스토리 생성** | 6WH 가이드 + 파이프라인 | 플로우 다이어그램 |
| 9 | **Carol Gray 10.4** | 10가지 기준 적용 | 기준별 아이콘 표 |
| 10 | **핵심 기능 3: 스토리 뷰어** | 3모드 + TTS + 고대비 | 뷰어 목업 스크린샷 |
| 11 | **핵심 기능 4: 협업·승인** | 3자 협업 플로우 | 시퀀스 다이어그램 |
| 12 | **디자인 시스템** | 컬러, 타이포, 컴포넌트 | 스타일 가이드 시각화 |
| 13 | **기술 스택** | 아키텍처 다이어그램 | 기술 아이콘 + 연결도 |
| 14 | **마일스톤 & KPI** | 12주 타임라인 + 목표 | 간트 차트 형식 |
| 15 | **Q&A / 마무리** | 로고 + 연락처 | 심플 배경 |

### PPT 슬라이드 디자인 규칙

```
[레이아웃 원칙]
- 슬라이드 크기: 16:9 (1920×1080)
- 여백: 상하좌우 60px
- 제목 영역: 상단 120px
- 컨텐츠 영역: 나머지

[색상 사용]
- 배경: Warm Ivory (#FAF8F3) 또는 #FFFFFF
- 제목: Deep Charcoal (#2C2C2A)
- 강조: Soft Mint (#A8D8D8) 또는 Coral Accent (#F08060)
- 보조: Lavender (#C9B8E8)

[타이포그래피]
- 슬라이드 제목: Pretendard SemiBold 36pt
- 소제목: Pretendard Medium 24pt
- 본문: Pretendard Regular 18pt
- 캡션: Pretendard Regular 14pt

[아이콘]
- Tabler Icons Outline 스타일
- 크기: 48px (카드 내) / 32px (인라인)
- 색상: Soft Mint 또는 Coral

[다이어그램]
- 연결선: 1.5px Soft Mint
- 박스: 모서리 16px, 흰 배경
- 화살표: Coral Accent
```

---

## 7. 아이콘 및 일러스트

### 7.1 기능별 아이콘 매핑 (Tabler Icons)

| 기능 | 아이콘 이름 |
|---|---|
| 홈/대시보드 | `home` |
| 스토리 만들기 | `book-plus` |
| 아바타 스튜디오 | `palette` |
| 협업 | `users` |
| 설정 | `settings` |
| 알림 | `bell` |
| 승인 대기 | `clock` |
| 승인됨 | `circle-check` |
| 거절됨 | `circle-x` |
| 댓글 | `message-circle` |
| 공유 | `share` |
| 삭제 | `trash` |
| 편집 | `edit` |
| 재생 | `player-play` |
| 일시정지 | `player-pause` |
| 고대비 | `contrast` |
| 음성 | `microphone` |
| 업로드 | `upload` |
| 아동 프로필 | `user-circle` |
| 그룹 | `users-group` |

### 7.2 일러스트 스타일

```
온보딩 페이지: 지브리풍 수채화 톤의 아동+어른 커뮤니케이션 일러스트
에러/빈 상태: 귀여운 캐릭터 표정 (슬픔, 기다림, 성공)
로딩 상태: 별/반짝임 애니메이션 (민트 톤)
```

---

## 8. 모션 및 인터랙션

### 8.1 전환 애니메이션

| 상황 | 애니메이션 | 시간 |
|---|---|---|
| 페이지 전환 | Slide (좌→우) | 300ms ease-out |
| 모달 등장 | Scale + Fade | 250ms ease-out |
| 카드 등장 | Fade + Slide Up | 200ms ease-out |
| 스토리 뷰어 페이지 전환 | Crossfade | 400ms ease-in-out |
| AI 생성 중 | Pulse (민트 색상) | 1.5s infinite |
| 승인 완료 | Confetti + Scale | 600ms |

### 8.2 마이크로인터랙션

| 요소 | 인터랙션 |
|---|---|
| 버튼 탭 | Scale 0.97 (100ms) |
| 카드 호버 | Shadow 증가 + Y -2px (150ms) |
| 알림 배지 | Pulse 애니메이션 (2초 주기) |
| TTS 하이라이트 | Background fade (민트 50% → 0%) |
| 로딩 스피너 | 민트 색상 원형 회전 |
| 아바타 선택 | Scale 1.05 + 민트 테두리 |

### 8.3 접근성 모션 설정

```css
/* 모션 감소 설정 (ASD 아동 배려) */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 부록: Tailwind 커스텀 클래스

```typescript
// 자주 사용하는 컴포넌트 클래스
const styles = {
  btnPrimary: 'bg-mint-300 text-charcoal font-medium py-3 px-6 rounded-xl min-h-[48px] hover:bg-mint-400 transition-colors',
  btnCTA: 'bg-coral-500 text-white font-semibold py-3 px-6 rounded-xl min-h-[48px] shadow-coral hover:bg-coral-600 transition-colors',
  btnGhost: 'border-[1.5px] border-mint-300 text-mint-500 font-medium py-3 px-6 rounded-xl min-h-[48px] hover:bg-mint-50 transition-colors',
  card: 'bg-white rounded-2xl shadow-sm border border-gray-100 p-5',
  badge: 'px-3 py-1 rounded-lg text-sm font-medium',
  badgeParent: 'bg-mint-300 text-charcoal',
  badgeTherapist: 'bg-lavender-300 text-charcoal',
  badgeTeacher: 'bg-orange-100 text-charcoal',
  input: 'w-full bg-white border-[1.5px] border-gray-200 rounded-xl px-4 py-3 font-body focus:outline-none focus:border-mint-300 transition-colors',
  sectionTitle: 'text-[22px] font-semibold text-charcoal',
  pageTitle: 'text-[28px] font-bold text-charcoal',
}
```

---

*StoryBridge DesignSpec v1.0 | 2026.06.04*
