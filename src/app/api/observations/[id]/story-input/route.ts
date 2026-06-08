import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { GenerateStoryInput } from '@/types/app.types'

/* ── GET /api/observations/[id]/story-input ─────────────────── */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist')
    return NextResponse.json({ error: '치료사만 접근 가능합니다.' }, { status: 403 })

  // RLS가 본인 기록 또는 접근 권한이 있는 아이의 기록으로 조회 범위를 제한함
  // (다른 보호자·교사가 기록한 관찰도 치료사가 그룹으로 연결돼 있다면 활용 가능)
  const { data: obs, error } = await supabase
    .from('behavior_observations')
    .select('*, child:children(id, name, age_group)')
    .eq('id', id)
    .single()

  if (error || !obs)
    return NextResponse.json({ error: '관찰 기록을 찾을 수 없습니다.' }, { status: 404 })

  // ABC → GenerateStoryInput 변환
  // A(선행자극) → raw_input (도전 상황)
  // B(행동) + replacement_behavior → AI 프롬프트 힌트
  // C(결과) → 개선된 결과 조망문 참고
  // SEAT 분류 → therapy_goal_tags 자동 힌트

  const SEAT_TO_THERAPY_TAG: Record<string, string> = {
    S: '감정 조절',
    E: '행동 전환',
    A: '사회적 의사소통',
    T: '또래 상호작용',
  }

  const therapy_goal_tags = obs.seat_function
    .map((f: string) => SEAT_TO_THERAPY_TAG[f])
    .filter(Boolean)

  const raw_input = [
    `[관찰된 도전 상황]\n${obs.antecedent}`,
    `[문제 행동]\n${obs.behavior}`,
    `[현재 결과]\n${obs.consequence}`,
    obs.replacement_behavior
      ? `[대체행동 목표]\n${obs.replacement_behavior}`
      : null,
  ].filter(Boolean).join('\n\n')

  const storyInput: Omit<GenerateStoryInput, 'presentation_mode' | 'chunking_type'> & {
    presentation_mode: string
    chunking_type: string
  } = {
    child_id: obs.child_id,
    raw_input,
    track: 'A',
    chunking_type: 'mixed',
    presentation_mode: 'cumulative',
    therapy_goal_tags,
    observation_id: obs.id,
    abc_observation: {
      antecedent: obs.antecedent,
      behavior: obs.behavior,
      consequence: obs.consequence,
      replacement_behavior: obs.replacement_behavior ?? undefined,
    },
  }

  return NextResponse.json({
    story_input: storyInput,
    observation: obs,
  })
}
