import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { synthesizeKorean, computeCacheKey } from '@/lib/tts/google'
import type { TTSVoice } from '@/types/app.types'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const text  = searchParams.get('text') ?? ''
  const voice = (searchParams.get('voice') ?? 'female') as TTSVoice

  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })

  const cacheKey = computeCacheKey(text, voice)
  const cachePath = `tts-cache/${cacheKey}.mp3`

  // tts-cache 버킷은 storage.objects에 일반 사용자용 INSERT 정책이 없으므로
  // service role 클라이언트로 업로드/조회한다 (story-images의 saveImageBuffer와 동일한 패턴)
  const serviceSupabase = await createServiceClient()

  // 캐시 확인
  const { data: existingFile } = await serviceSupabase.storage
    .from('tts-cache')
    .list('', { search: `${cacheKey}.mp3` })

  if (existingFile && existingFile.length > 0) {
    const { data: { publicUrl } } = serviceSupabase.storage
      .from('tts-cache')
      .getPublicUrl(cachePath)

    return NextResponse.json({ audio_url: publicUrl, word_timings: [] })
  }

  // 신규 합성
  try {
    const { audioBase64, wordTimings } = await synthesizeKorean(text, voice)
    const audioBuffer = Buffer.from(audioBase64, 'base64')

    const { error: uploadError } = await serviceSupabase.storage
      .from('tts-cache')
      .upload(cachePath, audioBuffer, { contentType: 'audio/mp3', upsert: true })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    const { data: { publicUrl } } = serviceSupabase.storage
      .from('tts-cache')
      .getPublicUrl(cachePath)

    return NextResponse.json({ audio_url: publicUrl, word_timings: wordTimings })
  } catch (err) {
    console.error('TTS error:', err)
    return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 500 })
  }
}

