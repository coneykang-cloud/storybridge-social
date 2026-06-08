import type { TTSVoice, WordTiming } from '@/types/app.types'

const VOICE_MAP: Record<TTSVoice, string> = {
  female: 'ko-KR-Neural2-A',
  male:   'ko-KR-Neural2-B',
  child:  'ko-KR-Neural2-C',
}

export interface TTSResult {
  audioBase64: string
  wordTimings: WordTiming[]
}

export async function synthesizeKorean(
  text: string,
  voice: TTSVoice = 'female'
): Promise<TTSResult> {
  const voiceName = VOICE_MAP[voice]
  const apiKey = process.env.GOOGLE_TTS_API_KEY

  const body = {
    input: { text },
    voice: {
      languageCode: 'ko-KR',
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 24000,
      speakingRate: 0.9,
    },
  }

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google TTS error: ${err}`)
  }

  const data = await res.json()

  const wordTimings: WordTiming[] = (data.timepoints ?? []).map(
    (tp: { markName: string; timeSeconds: number }, i: number, arr: { timeSeconds: number }[]) => ({
      word: tp.markName,
      start_ms: Math.round(tp.timeSeconds * 1000),
      end_ms: Math.round((arr[i + 1]?.timeSeconds ?? tp.timeSeconds + 0.5) * 1000),
    })
  )

  return {
    audioBase64: data.audioContent,
    wordTimings,
  }
}

export function computeCacheKey(text: string, voice: TTSVoice): string {
  // 간단한 해시 — 실제로는 crypto.subtle 사용 권장
  let hash = 0
  const str = `${voice}:${text}`
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return `tts_${Math.abs(hash).toString(16)}`
}
