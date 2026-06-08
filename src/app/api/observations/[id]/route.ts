import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* ── GET /api/observations/[id] ─────────────────────────────── */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS가 "본인 기록 또는 접근 권한이 있는 아이의 기록"으로 조회 범위를 제한함
  const { data, error } = await supabase
    .from('behavior_observations')
    .select('*, child:children(id, name, age_group)')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: '관찰 기록을 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json({ observation: data })
}

/* ── PATCH /api/observations/[id] — 관찰 기록 수정 ─────────── */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()

  const { data: existing } = await supabase
    .from('behavior_observations').select('recorder_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: '관찰 기록을 찾을 수 없습니다.' }, { status: 404 })

  const isOwner = existing.recorder_id === user.id
  const isTherapist = profile?.role === 'therapist'

  let allowed: string[]
  if (isOwner) {
    // 작성자 본인: ABC 내용 전체 수정 가능 (SEAT·대체행동 목표는 치료사인 경우에만)
    allowed = ['antecedent', 'behavior', 'consequence', 'setting', 'observed_at']
    if (isTherapist) allowed.push('replacement_behavior', 'seat_function')
  } else if (isTherapist) {
    // 다른 사람이 작성한 기록: 치료사는 SEAT 분류·대체행동 목표만 추가/수정 가능
    allowed = ['replacement_behavior', 'seat_function']
  } else {
    return NextResponse.json({ error: '이 기록을 수정할 권한이 없습니다.' }, { status: 403 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('behavior_observations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ observation: data })
}

/* ── DELETE /api/observations/[id] — 관찰 기록 삭제 ─────────── */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('behavior_observations')
    .delete()
    .eq('id', id)
    .eq('recorder_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
