import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const childId = formData.get('child_id') as string | null

  if (!file || !childId) {
    return NextResponse.json({ error: '파일과 아동 ID가 필요합니다.' }, { status: 400 })
  }

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    return NextResponse.json({ error: 'JPEG 또는 PNG 파일만 가능합니다.' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 })
  }

  // 보호자 권한 확인
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', user.id)
    .single()

  if (!child) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const serviceSupabase = await createServiceClient()
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  // ✅ story-images (공개 버킷) 의 temp 폴더에 업로드
  // → Replicate가 URL로 직접 접근 가능
  const path = `temp/${childId}/${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await serviceSupabase.storage
    .from('story-images')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: `업로드 실패: ${uploadError.message}` }, { status: 500 })
  }

  // 공개 버킷이므로 publicUrl 바로 사용 가능
  const { data: { publicUrl } } = serviceSupabase.storage
    .from('story-images')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
