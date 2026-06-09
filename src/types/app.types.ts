// ── 기본 타입 ────────────────────────────────────────────────────
export type UserRole = 'parent' | 'therapist' | 'teacher' | 'child'
export type AvatarStyle = 'ghibli' | 'realistic' | 'pixar' | 'watercolor'
export type AgeGroup = '5-6' | '7-9' | '10-12' | '13-15' | '16-18'
export type StorySource = 'ai' | 'pool' | 'manual'
export type StoryStatus = 'draft' | 'published' | 'archived'
export type PageType = 'intro' | 'body' | 'conclusion'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type ViewerMode = 'manual' | 'autoplay' | 'slideshow'
export type TTSVoice = 'male' | 'female' | 'child'

// ── v2 신규 타입 ────────────────────────────────────────────────
export type Track = 'A' | 'B' | 'C'
export type ChunkingType = 'temporal' | 'spatial' | 'mixed'
export type PresentationMode = 'cumulative' | 'sequential'
export type SeatFunction = 'S' | 'E' | 'A' | 'T'
export type ObservationSetting = 'clinic' | 'school' | 'home'

// ── 인터페이스 ──────────────────────────────────────────────────
export interface UserProfile {
  id: string
  full_name: string
  role: UserRole
  phone?: string
  created_at: string
  updated_at: string
}

export interface Child {
  id: string
  parent_id: string
  name: string
  birth_year: number
  age_group: AgeGroup
  interests: string[]
  familiar_envs: string[]
  notes?: string
  avatar_id?: string
  created_at: string
  updated_at: string
}

export interface Avatar {
  id: string
  child_id: string
  style: AvatarStyle
  image_url: string
  prompt_used?: string
  is_default: boolean
  created_at: string
}

export interface Group {
  id: string
  child_id: string
  invite_code: string
  created_at: string
}

export interface GroupMember {
  group_id: string
  user_id: string
  role: UserRole
  joined_at: string
  profile?: UserProfile
}

// ── Story — v2 확장 ─────────────────────────────────────────────
export interface Story {
  id: string
  child_id: string
  creator_id: string
  title: string

  // v2 신규
  track: Track
  created_by_role: UserRole
  chunking_type: ChunkingType
  presentation_mode: PresentationMode
  therapy_goal_tags: string[]
  school_context_tags: string[]
  home_connection_memo: string | null

  source: StorySource
  pool_template_id?: string
  status: StoryStatus
  raw_input?: string
  six_wh?: SixWH
  page_count: number
  observation_id?: string | null  // v3.2 신규
  created_at: string
  updated_at: string
  child?: Child
}

export interface SixWH {
  who: string | null
  when: string | null
  where: string | null
  what: string | null
  how: string | null
  why: string | null
  missing: string[]
  child_name?: string
}

// ── StoryPage — v2 확장 ─────────────────────────────────────────
export interface StoryPage {
  id: string
  story_id: string
  page_number: number
  page_type: PageType
  image_url?: string
  image_prompt?: string
  descriptive?: string
  perspective?: string
  coaching?: string
  chunking_label?: string
  cumulative_strip_text?: string   // v2 신규: 누적 제시 스트립 텍스트
  tts_url?: string
  created_at: string
  updated_at: string
}

export interface StoryPool {
  id: string
  age_group: AgeGroup
  category: 'school' | 'daily'
  title: string
  description: string
  base_pages: Partial<StoryPage>[]
  thumbnail_url?: string
  tags: string[]
  created_at: string
}

export interface Approval {
  id: string
  story_id: string
  page_id?: string
  requester_id: string
  track?: Track   // v2 신규
  status: ApprovalStatus
  diff_before: Partial<StoryPage>
  diff_after: Partial<StoryPage>
  feedback?: string
  created_at: string
  resolved_at?: string
  requester?: UserProfile
}

export interface Comment {
  id: string
  story_id: string
  page_id?: string
  author_id: string
  content: string
  is_read: boolean
  created_at: string
  updated_at: string
  author?: UserProfile
}

export interface WordTiming {
  word: string
  start_ms: number
  end_ms: number
}

// ── GenerateStoryInput — v2 확장 ────────────────────────────────
export interface GenerateStoryInput {
  child_id: string
  raw_input: string

  // v2 신규
  track: Track
  chunking_type: ChunkingType
  presentation_mode: PresentationMode
  therapy_goal_tags?: string[]
  school_context_tags?: string[]
  home_connection_memo?: string
  request_therapist_review?: boolean

  // v3.2 신규: ABC 관찰 연결
  observation_id?: string
  abc_observation?: {
    antecedent: string
    behavior: string
    consequence: string
    replacement_behavior?: string
  }

  avatar_id?: string
}

export interface GenerateAvatarInput {
  child_id: string
  style: AvatarStyle
  photo_url: string
}

export interface Notification {
  id: string
  type: 'approval_request' | 'approval_result' | 'comment' | 'track_notify'
  title: string
  body: string
  story_id?: string
  is_read: boolean
  created_at: string
}

// ── v2 신규: ChunkingConfig ─────────────────────────────────────
export interface ChunkingConfig {
  chunking_type: ChunkingType
  presentation_mode: PresentationMode
  can_edit: boolean
}

// ── v2 신규: Track 메타 상수 ────────────────────────────────────
export const TRACK_META: Record<Track, {
  label: string
  emoji: string
  role: UserRole
  color: string
  bgClass: string
}> = {
  A: { label: '치료사 생성', emoji: '🩺', role: 'therapist', color: '#C9B8E8', bgClass: 'bg-lavender-100' },
  B: { label: '보호자 생성', emoji: '👩', role: 'parent',    color: '#A8D8D8', bgClass: 'bg-mint-100' },
  C: { label: '교사 생성',   emoji: '👩‍🏫', role: 'teacher',   color: '#F5C5A3', bgClass: 'bg-orange-100' },
}

export const AGE_GROUP_META: Record<AgeGroup, { label: string; desc: string }> = {
  '5-6':   { label: '미취학',      desc: '만 5~6세' },
  '7-9':   { label: '초(저학년)', desc: '만 7~9세' },
  '10-12': { label: '초(고학년)', desc: '만 10~12세' },
  '13-15': { label: '중학생',      desc: '만 13~15세' },
  '16-18': { label: '고등학생',    desc: '만 16~18세' },
}

export function calcAgeGroup(birthYear: number): AgeGroup {
  const age = new Date().getFullYear() - birthYear
  if (age <= 6)  return '5-6'
  if (age <= 9)  return '7-9'
  if (age <= 12) return '10-12'
  if (age <= 15) return '13-15'
  return '16-18'
}

export const CHUNKING_DEFAULTS: ChunkingConfig = {
  chunking_type: 'mixed',
  presentation_mode: 'cumulative',
  can_edit: false,
}

export const THERAPY_GOAL_OPTIONS = [
  '사회적 의사소통',
  '감정 조절',
  '행동 전환',
  '또래 상호작용',
  '일상 루틴',
] as const

export const SCHOOL_CONTEXT_OPTIONS = [
  '수업 참여',
  '급식·쉬는 시간',
  '모둠 활동',
  '학교 행사',
  '교실 규칙',
  '전환 활동',
] as const

export const CHUNKING_TYPE_META: Record<ChunkingType, {
  label: string
  desc: string
  example: string
  efScore: string
  isDefault: boolean
}> = {
  temporal: {
    label: '시간적 청킹',
    desc: '사건을 시간 순서로 분절',
    example: '먼저 → 그 다음 → 마지막으로',
    efScore: 'M=61.88',
    isDefault: false,
  },
  spatial: {
    label: '공간적 청킹',
    desc: '장소 맥락에 따라 분절',
    example: '교실에서 → 복도에서 → 급식실에서',
    efScore: 'M=65.23',
    isDefault: false,
  },
  mixed: {
    label: '혼합 청킹',
    desc: '시간 + 공간 표지어 동시 사용',
    example: '급식실에서, 먼저 → 그 다음',
    efScore: 'M=74.68',
    isDefault: true,
  },
}

export const PRESENTATION_MODE_META: Record<PresentationMode, {
  label: string
  desc: string
  isDefault: boolean
}> = {
  cumulative: {
    label: '누적 제시',
    desc: '이전 단계를 화면에 누적하여 유지',
    isDefault: true,
  },
  sequential: {
    label: '순차 제시',
    desc: '현재 단계만 표시 (기존 방식)',
    isDefault: false,
  },
}

// ── v3.2 신규: BehaviorObservation ──────────────────────────────
export interface BehaviorObservation {
  id: string
  child_id: string
  recorder_id: string
  recorder_role: UserRole
  antecedent: string
  behavior: string
  consequence: string
  replacement_behavior?: string | null
  setting: ObservationSetting
  seat_function: SeatFunction[]
  observed_at: string
  story_id?: string | null
  observation_id?: string | null
  created_at: string
  updated_at: string
  // 조인 결과
  child?: Pick<Child, 'id' | 'name' | 'age_group'>
}

export interface SeatAnalysisResult {
  seat_function: SeatFunction[]
  confidence: number
  rationale: string
  replacement_behavior_suggestion?: string
}

export const SEAT_META: Record<SeatFunction, { label: string; desc: string; color: string; bgClass: string }> = {
  S: { label: '감각 자기자극', desc: '특정 감각 입력에 반응하거나 취하려는 행동', color: '#9B72CF', bgClass: 'bg-purple-100 text-purple-700 border-purple-300' },
  E: { label: '도피·회피',    desc: '어려운 과제나 상황에서 벗어나려는 행동',    color: '#EF8C57', bgClass: 'bg-orange-100 text-orange-700 border-orange-300' },
  A: { label: '관심 요청',    desc: '특정인의 주의를 얻으려는 행동',              color: '#4CAEAE', bgClass: 'bg-mint-100 text-mint-700 border-mint-300' },
  T: { label: '유형적 요구',  desc: '특정 물건이나 활동을 얻으려는 행동',         color: '#F0A878', bgClass: 'bg-amber-100 text-amber-700 border-amber-300' },
}

export const OBSERVATION_SETTING_META: Record<ObservationSetting, { label: string; emoji: string }> = {
  clinic: { label: '클리닉', emoji: '🏥' },
  school: { label: '학교',   emoji: '🏫' },
  home:   { label: '가정',   emoji: '🏠' },
}

export const RECORDER_ROLE_META: Record<UserRole, { label: string; emoji: string }> = {
  parent:    { label: '보호자', emoji: '👪' },
  therapist: { label: '치료사', emoji: '🩺' },
  teacher:   { label: '교사',   emoji: '🍎' },
  child:     { label: '아이',   emoji: '👧' },
}

