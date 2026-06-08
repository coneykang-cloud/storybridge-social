import { getOpenAIClient } from './client'
import {
  SIX_WH_EXTRACTION_SYSTEM,
  buildSixWhExtractionPrompt,
  buildStoryGenerationSystem,
  buildStoryGenerationPrompt,
  CLARIFYING_QUESTIONS,
} from '@/lib/prompts/story-generation'
import type { Child, SixWH, ChunkingType, StoryPage, PageType, AvatarStyle } from '@/types/app.types'
import { CHUNKING_TYPE_META } from '@/types/app.types'

export async function extractSixWH(rawInput: string, child: Child): Promise<SixWH> {
  const openai = getOpenAIClient()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SIX_WH_EXTRACTION_SYSTEM },
      { role: 'user', content: buildSixWhExtractionPrompt(rawInput, child) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 800,
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  return JSON.parse(text) as SixWH
}

export function getClarifyingQuestions(missing: string[]): string[] {
  return missing
    .filter((key) => key in CLARIFYING_QUESTIONS)
    .slice(0, 2)
    .map((key) => CLARIFYING_QUESTIONS[key])
}

export async function* generateStoryStream(
  sixWh: SixWH,
  child: Child,
  chunkingType: ChunkingType,
  avatarStyle?: AvatarStyle
): AsyncGenerator<Partial<StoryPage>> {
  const openai = getOpenAIClient()

  // OpenAI SDK v4: stream via create() with stream:true
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: buildStoryGenerationSystem(child, chunkingType, avatarStyle) },
      { role: 'user', content: buildStoryGenerationPrompt(sixWh, child) },
    ],
    temperature: 0.7,
    max_tokens: 3000,
    stream: true,
  })

  let accumulated = ''

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? ''
    accumulated += delta
  }

  // 스트리밍 완료 후 전체 JSON 파싱
  const pages = tryParsePages(accumulated)
  for (const page of pages) {
    yield page
  }
}

function tryParsePages(raw: string): Partial<StoryPage>[] {
  // JSON 코드 블록 제거
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      return parsed.map((p, i) => ({
        page_number: p.page_number ?? i + 1,
        page_type: (p.page_type ?? 'body') as PageType,
        chunking_label: p.chunking_label ?? null,
        descriptive: p.descriptive ?? '',
        perspective: p.perspective ?? null,
        coaching: p.coaching ?? null,
        image_prompt: p.image_prompt ?? '',
      }))
    }
  } catch {
    // JSON 파싱 실패 시 빈 배열 반환
  }

  return []
}

export async function generateStoryTitle(sixWh: SixWH, child: Child, chunkingType: ChunkingType): Promise<string> {
  const openai = getOpenAIClient()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `당신은 ASD 아동용 소셜 스토리 제목을 작성하는 전문가입니다.
6WH 정보를 바탕으로 스토리의 상황과 배울 점이 자연스럽게 드러나는 문장형 제목을 작성하세요.
규칙: 한국어, 15~25자 내외의 완결된 문장 또는 구절, 아동의 이름을 자연스럽게 포함, 구체적인 상황·행동이 드러나도록 작성.
예시: "민준이의 급식 줄 서기 연습 이야기", "태인이와 함께하는 버스 타는 날", "쉬는 시간에 친구에게 먼저 인사하기"
JSON 형식으로만 응답: {"title": "제목"}`,
      },
      {
        role: 'user',
        content: `아동: ${child.name}(${new Date().getFullYear() - child.birth_year}세)
청킹 유형: ${CHUNKING_TYPE_META[chunkingType].label}
누가: ${sixWh.who ?? '-'}
어디서: ${sixWh.where ?? '-'}
무엇을: ${sixWh.what ?? '-'}
어떻게: ${sixWh.how ?? '-'}
왜: ${sixWh.why ?? '-'}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.6,
    max_tokens: 60,
  })

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}')
    return parsed.title ?? `${child.name}의 이야기`
  } catch {
    return `${child.name}의 이야기`
  }
}

export async function regeneratePage(
  page: Partial<StoryPage>,
  child: Child,
  chunkingType: ChunkingType
): Promise<Partial<StoryPage>> {
  const openai = getOpenAIClient()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: buildStoryGenerationSystem(child, chunkingType),
      },
      {
        role: 'user',
        content: `다음 페이지를 더 나은 내용으로 다시 작성해주세요. 같은 JSON 형식으로 1개 페이지만 반환하세요.\n현재 내용:\n${JSON.stringify(page, null, 2)}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_tokens: 600,
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(text)

  return {
    page_number: page.page_number,
    page_type: (parsed.page_type ?? page.page_type) as PageType,
    chunking_label: parsed.chunking_label ?? page.chunking_label,
    descriptive: parsed.descriptive ?? page.descriptive,
    perspective: parsed.perspective ?? page.perspective,
    coaching: parsed.coaching ?? page.coaching,
    image_prompt: parsed.image_prompt ?? page.image_prompt,
  }
}
