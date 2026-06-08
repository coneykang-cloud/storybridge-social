import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* ── PATCH /api/observations/[id]/link — 스토리와 연결 ──────── */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist')
    return NextResponse.json({ error: '치료사만 접근 가능합니다.' }, { status: 403 })

  const { story_id } = await request.json()
  if (!story_id) return NextResponse.json({ error: 'story_id는 필수입니다.' }, { status: 400 })

  // 관찰 기록에 story_id 저장
  const { error: obsErr } = await supabase
    .from('behavior_observations')
    .update({ story_id })
    .eq('id', id)
    .eq('recorder_id', user.id)

  if (obsErr) return NextResponse.json({ error: obsErr.message }, { status: 500 })

  // 스토리에 observation_id 저장
  const { error: storyErr } = await supabase
    .from('stories')
    .update({ observation_id: id })
    .eq('id', story_id)

  if (storyErr) return NextResponse.json({ error: storyErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
