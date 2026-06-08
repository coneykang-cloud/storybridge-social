import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ObservationSetting, SeatFunction } from '@/types/app.types'

/* ── GET /api/observations?child_id=xxx ──────────────────────── */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const child_id = searchParams.get('child_id')
  const limit = Number(searchParams.get('limit') ?? '20')
  const offset = Number(searchParams.get('offset') ?? '0')

  // RLS가 "본인 기록 또는 접근 권한이 있는 아이의 기록"으로 조회 범위를 제한함
  let query = supabase
    .from('behavior_observations')
    .select('*, child:children(id, name, age_group)', { count: 'exact' })
    .order('observed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (child_id) query = query.eq('child_id', child_id)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ observations: data, total: count })
}

/* ── POST /api/observations ──────────────────────────────────── */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: '프로필을 찾을 수 없습니다.' }, { status: 404 })

  const body = await request.json()
  const { child_id, antecedent, behavior, consequence, replacement_behavior, setting, seat_function, observed_at } = body

  // 필수 필드 검증
  const required = ['child_id', 'antecedent', 'behavior', 'consequence']
  for (const field of required) {
    if (!body[field]?.trim()) {
      return NextResponse.json({ error: `${field}은 필수입니다.` }, { status: 400 })
    }
  }

  const validSettings: ObservationSetting[] = ['clinic', 'school', 'home']
  if (setting && !validSettings.includes(setting)) {
    return NextResponse.json({ error: '환경 값이 올바르지 않습니다.' }, { status: 400 })
  }

  const validSeat: SeatFunction[] = ['S', 'E', 'A', 'T']
  if (seat_function && !Array.isArray(seat_function)) {
    return NextResponse.json({ error: 'seat_function은 배열이어야 합니다.' }, { status: 400 })
  }
  if (seat_function?.some((f: string) => !validSeat.includes(f as SeatFunction))) {
    return NextResponse.json({ error: 'seat_function 값이 올바르지 않습니다.' }, { status: 400 })
  }

  // SEAT 기능 분류·대체행동 목표는 치료사 전용 컬럼 — 다른 역할이 보내도 무시
  const isTherapist = profile.role === 'therapist'

  const { data, error } = await supabase
    .from('behavior_observations')
    .insert({
      child_id,
      recorder_id: user.id,
      recorder_role: profile.role,
      antecedent: antecedent.trim(),
      behavior: behavior.trim(),
      consequence: consequence.trim(),
      replacement_behavior: isTherapist ? (replacement_behavior?.trim() ?? null) : null,
      setting: setting ?? 'clinic',
      seat_function: isTherapist ? (seat_function ?? []) : [],
      observed_at: observed_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '42501')
      return NextResponse.json({ error: '이 아이에 대한 관찰 기록 작성 권한이 없습니다.' }, { status: 403 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ observation: data }, { status: 201 })
}
