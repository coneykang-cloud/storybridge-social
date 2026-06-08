import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { extractSixWH, getClarifyingQuestions, generateStoryStream, generateStoryTitle } from '@/lib/openai/story'
import { generateStoryPageImage } from '@/lib/openai/avatar'
import type { GenerateStoryInput, StoryPage, PageType, AvatarStyle } from '@/types/app.types'
import { TRACK_META } from '@/types/app.types'

export const runtime = 'nodejs'
export const maxDuration = 120

// 이미지 버퍼를 Supabase Storage에 영구 저장 → 공개 URL 반환
// Pollinations는 모델에 따라 PNG/JPEG를 섞어 반환하므로, 실제 contentType에 맞춰 확장자를 정한다.
async function saveImageBuffer(
  buffer: ArrayBuffer,
  contentType: string,
  storyId: string,
  pageNumber: number
): Promise<string> {
  const serviceSupabase = await createServiceClient()

  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
  const path = `pages/${storyId}/page-${pageNumber}.${ext}`
  const { error } = await serviceSupabase.storage
    .from('story-images')
    .upload(path, buffer, { contentType, upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: { publicUrl } } = serviceSupabase.storage
    .from('story-images')
    .getPublicUrl(path)

  return publicUrl
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const input: GenerateStoryInput = await request.json()
  const {
    child_id, raw_input, chunking_type, track, presentation_mode,
    therapy_goal_tags, school_context_tags, home_connection_memo, observation_id,
  } = input

  // 아동 프로필 조회
  const { data: child } = await supabase
    .from('children')
    .select('*')
    .eq('id', child_id)
    .single()

  if (!child) {
    return new Response('Child not found', { status: 404 })
  }

  // 아동의 기본 아바타 조회 (없으면 undefined) — 이미지가 있으면 페이지 일러스트의 캐릭터 기준으로 사용
  const { data: defaultAvatar } = await supabase
    .from('avatars')
    .select('style, image_url')
    .eq('child_id', child_id)
    .eq('is_default', true)
    .single()

  const avatarStyle = defaultAvatar?.style as AvatarStyle | undefined
  const avatarImageUrl = defaultAvatar?.image_url ?? null

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        // STAGE 1: 6WH 추출
        const sixWh = await extractSixWH(raw_input, child)

        // 누락 요소가 있으면 후속 질문 반환
        if (sixWh.missing.length > 2) {
          const questions = getClarifyingQuestions(sixWh.missing)
          send({ type: 'clarify', data: { questions } })
          controller.close()
          return
        }

        // STAGE 2: 소셜 스토리 생성 (스트리밍) + 제목 생성 (병렬)
        const generatedPages: Partial<StoryPage>[] = []
        const [, storyTitle] = await Promise.all([
          (async () => {
            for await (const page of generateStoryStream(sixWh, child, chunking_type, avatarStyle)) {
              generatedPages.push(page)
              send({ type: 'page', data: page })
            }
          })(),
          generateStoryTitle(sixWh, child, chunking_type),
        ])

        if (generatedPages.length === 0) {
          throw new Error('No pages generated')
        }

        // STAGE 3: 스토리 DB 저장
        const { data: story } = await supabase
          .from('stories')
          .insert({
            child_id,
            creator_id: user.id,
            title: storyTitle,
            track,
            created_by_role: TRACK_META[track].role,
            chunking_type,
            presentation_mode,
            therapy_goal_tags: therapy_goal_tags ?? [],
            school_context_tags: school_context_tags ?? [],
            home_connection_memo: home_connection_memo ?? null,
            observation_id: observation_id ?? null,
            source: 'ai',
            raw_input,
            six_wh: sixWh,
            page_count: generatedPages.length,
            status: 'draft',
          })
          .select()
          .single()

        if (!story) throw new Error('Failed to save story')

        // 페이지 저장 + 이미지 생성(Pollinations) + Storage 영구 저장 — 순차 처리
        // Pollinations IP당 동시 대기열 1개 제한 → 한 번에 하나씩 처리
        const pages = []
        for (let index = 0; index < generatedPages.length; index++) {
          const page = generatedPages[index]
          let imageUrl: string | null = null
          try {
            if (page.image_prompt) {
              const { buffer, contentType } = await generateStoryPageImage(page.image_prompt, avatarStyle, avatarImageUrl)
              imageUrl = await saveImageBuffer(buffer, contentType, story.id, index + 1)
            }
          } catch (imgErr) {
            console.error(`[story/generate] page ${index + 1} image failed:`, (imgErr as Error).message)
          }
          pages.push({
            story_id: story.id,
            page_number: index + 1,
            page_type: (page.page_type ?? 'body') as PageType,
            image_url: imageUrl ?? undefined,
            image_prompt: page.image_prompt ?? undefined,
            descriptive: page.descriptive ?? undefined,
            perspective: page.perspective ?? undefined,
            coaching: page.coaching ?? undefined,
            chunking_label: page.chunking_label ?? undefined,
          })
        }
        await supabase.from('story_pages').insert(pages)

        send({ type: 'done', data: { story, page_count: pages.length } })
      } catch (err) {
        send({ type: 'error', data: { message: (err as Error).message } })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
