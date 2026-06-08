import Replicate from 'replicate'
import type { AvatarStyle } from '@/types/app.types'

export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY!,
})

// ── face-to-many 스타일 설정 (지브리 제외) ──────────────────────
const FACE_TO_MANY_CONFIG: Record<Exclude<AvatarStyle, 'ghibli'>, {
  style: string
  prompt: string
  ip_adapter_scale: number
}> = {
  realistic: {
    style: '3D',
    prompt:
      'High quality 3D render, friendly child portrait, ' +
      'soft studio lighting, warm skin tones, ' +
      'bright expressive eyes, natural smile, white background',
    ip_adapter_scale: 0.85,
  },
  pixar: {
    style: '3D',
    prompt:
      'Pixar Disney animation style, cute child character, ' +
      'big round glossy eyes, soft rounded cheeks, ' +
      'warm friendly smile, vibrant colors, ' +
      'cinematic lighting, white background',
    ip_adapter_scale: 0.85,
  },
  watercolor: {
    style: 'Toy',
    prompt:
      'Soft toy figure style, pastel color palette, ' +
      'gentle warm atmosphere, kind expression, ' +
      'child face, smooth texture, white background',
    ip_adapter_scale: 0.80,
  },
}

// ── FLUX 2 Pro: 지브리풍 고품질 img2img ─────────────────────────
export async function startGhibliPrediction(photoUrl: string): Promise<string> {
  const prediction = await replicate.predictions.create({
    model: 'black-forest-labs/flux-2-pro',
    input: {
      image: photoUrl,
      prompt:
        'Studio Ghibli anime style illustration of a Korean child, ' +
        'soft watercolor background, warm pastel tones, ' +
        'gentle expression, large expressive eyes, ' +
        'child-friendly, centered composition, ' +
        'white background, no text, Hayao Miyazaki style',
      negative_prompt:
        'realistic photo, ugly, blurry, bad anatomy, ' +
        'text, watermark, violence, nsfw, adult',
      prompt_strength: 0.80,
      num_inference_steps: 28,
      aspect_ratio: '1:1',
    },
  })
  return prediction.id
}

// ── FLUX Kontext Pro: 수채화풍 ───────────────────────────────────
export async function startWatercolorPrediction(photoUrl: string): Promise<string> {
  const prediction = await replicate.predictions.create({
    model: 'black-forest-labs/flux-kontext-pro',
    input: {
      input_image: photoUrl,
      prompt:
        'Transform this child into a soft watercolor painting illustration, ' +
        'delicate brushstrokes, pastel color palette, ' +
        'warm dreamy atmosphere, gentle kind expression, ' +
        'children book illustration style, white background, ' +
        'high quality artistic watercolor, keep the face similar',
      aspect_ratio: '1:1',
      output_format: 'png',
      safety_tolerance: 2,
    },
  })
  return prediction.id
}

// ── Midjourney Diffusion: 픽사풍 ────────────────────────────────
export async function startPixarPrediction(photoUrl: string): Promise<string> {
  const prediction = await replicate.predictions.create({
    version: '436b051ebd8f68d23e83d22de5e198e0995357afef113768c20f0b6fcef23c8b',
    input: {
      prompt:
        'mdjrny-v4 style, portrait of a cute human Korean child, ' +
        'Pixar Disney 3D animation style, human face, human child, ' +
        'big round glossy eyes, soft rounded cheeks, warm friendly smile, ' +
        'vibrant saturated colors, cinematic lighting, white background, ' +
        'high quality, masterpiece, human boy or girl',
      negative_prompt:
        'animal, cat, dog, fur, beast, creature, monster, ' +
        'ugly, blurry, bad anatomy, extra limbs, text, watermark, violence, nsfw, adult, scary, ' +
        'non-human, cartoon animal, anthropomorphic',
      init_image: photoUrl,
      prompt_strength: 0.75,
      num_inference_steps: 20,   // 30 → 20으로 줄여 속도 향상
      guidance_scale: 7,
      width: 512,
      height: 512,
    },
  })
  return prediction.id
}

// ── face-to-many: realistic, pixar, watercolor ──────────────────
export async function startFaceToManyPrediction(
  photoUrl: string,
  style: Exclude<AvatarStyle, 'ghibli'>
): Promise<string> {
  const config = FACE_TO_MANY_CONFIG[style]

  const prediction = await replicate.predictions.create({
    version: 'a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf',
    input: {
      image: photoUrl,
      style: config.style,
      prompt: config.prompt,
      negative_prompt:
        'ugly, distorted face, blurry, bad anatomy, ' +
        'extra limbs, text, watermark, violence, nsfw, scary',
      num_outputs: 1,
      guidance_scale: 7.5,
      num_inference_steps: 28,
      controlnet_conditioning_scale: 0.75,
      ip_adapter_scale: config.ip_adapter_scale,
    },
  })
  return prediction.id
}

// ── 메인 예측 시작 함수 ──────────────────────────────────────────
export async function startAvatarPrediction(
  photoUrl: string,
  style: AvatarStyle,
): Promise<string> {
  if (style === 'ghibli')     return startGhibliPrediction(photoUrl)
  if (style === 'watercolor') return startWatercolorPrediction(photoUrl)
  return startFaceToManyPrediction(photoUrl, style as Exclude<AvatarStyle, 'ghibli' | 'watercolor'>)
}

// ── 예측 상태 확인 ───────────────────────────────────────────────
export async function getPredictionStatus(predictionId: string) {
  const prediction = await replicate.predictions.get(predictionId)

  // FLUX output은 단일 URL 문자열, face-to-many는 배열
  let output: string[] | null = null
  if (prediction.output) {
    if (typeof prediction.output === 'string') {
      output = [prediction.output]
    } else if (Array.isArray(prediction.output)) {
      output = prediction.output as string[]
    }
  }

  return {
    status: prediction.status,
    output,
    error: prediction.error as string | null,
  }
}
