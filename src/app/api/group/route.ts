import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// 초대 코드로 그룹 참여
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_code } = await request.json()
  if (!invite_code) return NextResponse.json({ error: 'invite_code is required' }, { status: 400 })

  // 초대 코드로 그룹 조회 — 참여 전이라 RLS상 그룹이 보이지 않으므로
  // 서비스 클라이언트로 우회 조회 (초대 코드를 아는 것 자체가 조회 권한의 근거)
  const serviceClient = await createServiceClient()
  const { data: group } = await serviceClient
    .from('groups')
    .select('id, child_id')
    .eq('invite_code', invite_code.trim().toLowerCase())
    .single()

  if (!group) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  // 이미 멤버인지 확인
  const { data: existing } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

  // 현재 사용자 역할 조회
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'parent') {
    return NextResponse.json({ error: '보호자는 초대 코드로 참여할 수 없어요.' }, { status: 403 })
  }

  // 그룹 멤버 추가
  const { error } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: profile.role,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ group_id: group.id, child_id: group.child_id })
}

// 내 그룹 목록 조회
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      role,
      joined_at,
      groups (
        id,
        invite_code,
        child_id,
        children (id, name, age_group)
      )
    `)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ groups: data })
}

