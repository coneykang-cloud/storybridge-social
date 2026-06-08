import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // 아바타 조회 + 보호자 권한 확인
  const { data: avatar } = await supabase
    .from('avatars')
    .select('id, child_id, children(parent_id)')
    .eq('id', id)
    .single()

  if (!avatar) return NextResponse.json({ error: '아바타를 찾을 수 없습니다.' }, { status: 404 })

  const parentId = (avatar.children as unknown as { parent_id: string } | null)?.parent_id
  if (parentId !== user.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const serviceSupabase = await createServiceClient()

  // 기존 기본 아바타 해제
  await serviceSupabase
    .from('avatars')
    .update({ is_default: false })
    .eq('child_id', avatar.child_id)

  // 선택한 아바타를 기본으로 설정
  await serviceSupabase
    .from('avatars')
    .update({ is_default: true })
    .eq('id', id)

  // children 테이블의 avatar_id 업데이트
  await serviceSupabase
    .from('children')
    .update({ avatar_id: id })
    .eq('id', avatar.child_id)

  return NextResponse.json({ ok: true })
}
