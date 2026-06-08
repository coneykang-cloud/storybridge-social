import { getOpenAIClient } from './client'
import { replicate } from '@/lib/replicate/avatar'
import { AVATAR_STYLE_PROMPTS, AVATAR_STYLE_IMAGE_INSTRUCTION } from '@/lib/prompts/story-generation'
import type { AvatarStyle } from '@/types/app.types'
import type { FileOutput } from 'replicate'

// 스타일별 Dicebear 아바타 (Social Story Creator 스타일의 친근한 만화 캐릭터)
export function buildDicebearUrl(style: AvatarStyle, name: string): string {
  const seed = encodeURIComponent(name)
  const base = 'https://api.dicebear.com/9.x'
  switch (style) {
    case 'ghibli':
      return `${base}/adventurer/png?seed=${seed}&backgroundColor=b6e3f4,ffd5dc,c0aede&backgroundType=gradientLinear&radius=50`
    case 'realistic':
      return `${base}/personas/png?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,b6e3f4`
    case 'pixar':
      return `${base}/big-smile/png?seed=${seed}&backgroundColor=c0aede,b6e3f4,ffdfbf&radius=50`
    case 'watercolor':
      return `${base}/adventurer-neutral/png?seed=${seed}&backgroundColor=d1f4cc,b6e3f4,ffd5dc&backgroundType=gradientLinear&radius=50`
    default:
      return `${base}/adventurer/png?seed=${seed}&backgroundColor=b6e3f4`
  }
}

export async function generateAvatarImage(
  style: AvatarStyle,
  age: number,
  name: string
): Promise<string> {
  const openai = getOpenAIClient()
  const promptFn = AVATAR_STYLE_PROMPTS[style]

  if (!promptFn) throw new Error(`Unknown avatar style: ${style}`)

  const prompt = promptFn(age, name)

  try {
    const response = await openai.images.generate({
      model: 'dall-e-2',
      prompt,
      size: '512x512',
      n: 1,
    })

    const url = response.data?.[0]?.url
    if (!url) throw new Error('No URL returned')
    return url
  } catch {
    console.warn('OpenAI image generation failed, using Dicebear avatar')
    return buildDicebearUrl(style, name)
  }
}

// 스토리 페이지 이미지 생성 — Replicate 사용
// (Pollinations.ai는 2026.06 무료 큐 정책 변경으로 "Queue full for IP (max: 1)" 402가
//  상시 발생해 사용 불가 판정 → 유료지만 저렴하고(장당 약 $0.003) 빠른 FLUX 계열로 전환)
//
// 등록된 아이 아바타 이미지가 있으면 FLUX Kontext Pro(이미지 기반 편집 모델)로
// "같은 캐릭터를 새 장면에 배치"해 페이지마다 얼굴·헤어·옷차림이 일관되게 유지되도록 한다.
// 아바타가 없으면 텍스트만으로 그리는 FLUX Schnell로 폴백한다.
export async function generateStoryPageImage(
  imagePrompt: string,
  avatarStyle?: AvatarStyle,
  avatarImageUrl?: string | null
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const stylePrefix = avatarStyle ? `${AVATAR_STYLE_IMAGE_INSTRUCTION[avatarStyle]}, ` : ''

  let file: FileOutput

  if (avatarImageUrl) {
    const scenePrompt =
      `Place this exact same character into a new scene: ${imagePrompt}. ` +
      `${stylePrefix}children's picture book illustration, ` +
      'keep the same face, hairstyle and outfit as the reference image, ' +
      'child-safe, wholesome, no text, no violence'

    file = await replicate.run('black-forest-labs/flux-kontext-pro', {
      input: {
        input_image: avatarImageUrl,
        prompt: scenePrompt.slice(0, 2000),
        aspect_ratio: '16:9',
        output_format: 'png',
        safety_tolerance: 2,
      },
    }) as unknown as FileOutput
  } else {
    const fullPrompt = `${stylePrefix}${imagePrompt}, children's picture book illustration, child-safe, wholesome, no text, no violence`

    const output = await replicate.run('black-forest-labs/flux-schnell', {
      input: {
        prompt: fullPrompt.slice(0, 2000),
        aspect_ratio: '16:9',
        output_format: 'png',
      },
    }) as FileOutput[]

    file = output[0]
  }

  if (!file) throw new Error('Replicate returned no output')

  const blob = await file.blob()
  return { buffer: await blob.arrayBuffer(), contentType: blob.type || 'image/png' }
}
