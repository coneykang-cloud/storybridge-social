import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPredictionStatus } from '@/lib/replicate/avatar'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const child_id = searchParams.get('child_id')
  const style = searchParams.get('style')
  const is_first = searchParams.get('is_first') === 'true'

  const { status, output, error } = await getPredictionStatus(id)

  if (status === 'failed') {
    return NextResponse.json({ status: 'failed', error: error ?? '생성 실패' })
  }

  if (status !== 'succeeded') {
    // 아직 처리 중
    return NextResponse.json({ status })
  }

  // 완료 → Storage 저장 + DB 기록
  const imageUrl = Array.isArray(output) ? output[0] : null
  if (!imageUrl) {
    return NextResponse.json({ status: 'failed', error: '이미지 URL 없음' })
  }

  const serviceSupabase = await createServiceClient()
  let publicUrl = imageUrl

  try {
    const imageRes = await fetch(imageUrl)
    const imageBuffer = await imageRes.arrayBuffer()
    const fileName = `avatars/${child_id}/${style}_${Date.now()}.png`

    // story-images 버킷은 공개(Public: ON) → URL 바로 접근 가능
    const { error: uploadError } = await serviceSupabase.storage
      .from('story-images')
      .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: false })

    if (!uploadError) {
      publicUrl = serviceSupabase.storage.from('story-images').getPublicUrl(fileName).data.publicUrl
    }
  } catch {
    // Storage 실패해도 원본 Replicate URL 사용
  }

  const { data: avatar } = await serviceSupabase
    .from('avatars')
    .insert({
      child_id,
      style,
      image_url: publicUrl,
      prompt_used: `replicate:face-to-many:${style}`,
      is_default: is_first,
    })
    .select()
    .single()

  return NextResponse.json({ status: 'succeeded', avatar })
}
