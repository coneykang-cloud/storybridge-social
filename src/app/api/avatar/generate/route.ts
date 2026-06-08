import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startAvatarPrediction } from '@/lib/replicate/avatar'
import { buildDicebearUrl } from '@/lib/openai/avatar'
import type { AvatarStyle } from '@/types/app.types'

export const runtime = 'nodejs'
export const maxDuration = 30  // 예측 제출만 하므로 30초면 충분

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { child_id, style, photo_url }: {
    child_id: string
    style: AvatarStyle
    photo_url: string
  } = await request.json()

  const { data: child } = await supabase
    .from('children')
    .select('id, name, birth_year, parent_id')
    .eq('id', child_id)
    .eq('parent_id', user.id)
    .single()

  if (!child) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const { count } = await supabase
    .from('avatars')
    .select('id', { count: 'exact', head: true })
    .eq('child_id', child_id)

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: '아바타는 최대 5개까지 저장할 수 있어요.' }, { status: 400 })
  }

  // Replicate 없으면 Dicebear 즉시 반환
  if (!process.env.REPLICATE_API_KEY || !photo_url) {
    const age = new Date().getFullYear() - child.birth_year
    const imageUrl = buildDicebearUrl(style, child.name)
    const { data: avatar } = await (await import('@/lib/supabase/server'))
      .createServiceClient()
      .then(s => s.from('avatars').insert({
        child_id, style, image_url: imageUrl,
        prompt_used: 'dicebear', is_default: (count ?? 0) === 0,
      }).select().single())
    return NextResponse.json({ avatar, method: 'dicebear' })
  }

  // Replicate 비동기 예측 시작 (즉시 prediction_id 반환)
  try {
    const predictionId = await startAvatarPrediction(photo_url, style)
    return NextResponse.json({
      prediction_id: predictionId,
      child_id,
      style,
      is_first: (count ?? 0) === 0,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `예측 시작 실패: ${msg}` }, { status: 500 })
  }
}
