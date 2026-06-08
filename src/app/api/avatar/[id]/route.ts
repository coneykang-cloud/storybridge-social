import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // 아바타 정보 조회 (보호자 권한 확인)
  const { data: avatar } = await supabase
    .from('avatars')
    .select('id, image_url, child_id, children(parent_id)')
    .eq('id', id)
    .single()

  if (!avatar) return NextResponse.json({ error: '아바타를 찾을 수 없습니다.' }, { status: 404 })

  const parentId = (avatar.children as unknown as { parent_id: string } | null)?.parent_id
  if (parentId !== user.id) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
  }

  const serviceSupabase = await createServiceClient()

  // Storage에서 파일 삭제
  if (avatar.image_url) {
    const url = new URL(avatar.image_url)
    // URL에서 파일 경로 추출 (예: /storage/v1/object/public/avatars/child_id/file.png)
    const pathMatch = url.pathname.match(/\/avatars\/(.+)$/)
    if (pathMatch) {
      await serviceSupabase.storage
        .from('avatars')
        .remove([pathMatch[1]])
    }
  }

  // DB에서 아바타 삭제
  const { error } = await serviceSupabase
    .from('avatars')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
