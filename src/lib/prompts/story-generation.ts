import type { Child, ChunkingType, SixWH, AvatarStyle } from '@/types/app.types'

// 아바타 스타일별 이미지 생성 지침 — 페이지 일러스트에 적용
export const AVATAR_STYLE_IMAGE_INSTRUCTION: Record<AvatarStyle, string> = {
  ghibli:     'Studio Ghibli anime style, soft watercolor background, warm pastel tones, Hayao Miyazaki aesthetic',
  realistic:  'Warm children\'s book illustration, friendly realistic style, soft lighting, gentle colors',
  pixar:      'Pixar/Disney 3D animated style, vibrant saturated colors, cute rounded characters, cinematic lighting',
  watercolor: 'Soft watercolor painting, delicate brushstrokes, pastel color palette, dreamy gentle atmosphere',
}

export const SIX_WH_EXTRACTION_SYSTEM = `당신은 Carol Gray Social Stories™ 전문가입니다.
주어진 텍스트에서 소셜 스토리 작성에 필요한 6WH 요소를 추출하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "who": "등장인물 (문자열 또는 null)",
  "when": "시간적 맥락 (문자열 또는 null)",
  "where": "장소 (문자열 또는 null)",
  "what": "상황 설명 (문자열 또는 null)",
  "how": "대처 행동 (문자열 또는 null)",
  "why": "이유/목적 (문자열 또는 null)",
  "missing": ["누락된 항목 키 배열"],
  "child_name": "아동 이름 (추출 가능 시, 없으면 null)"
}`

export function buildSixWhExtractionPrompt(rawInput: string, child: Child): string {
  return `아동 정보: 이름=${child.name}, 나이=${new Date().getFullYear() - child.birth_year}세, 관심사=${child.interests.join(', ')}

입력 텍스트:
${rawInput}`
}

export function buildStoryGenerationSystem(
  child: Child,
  chunkingType: ChunkingType,
  avatarStyle?: AvatarStyle
): string {
  const age = new Date().getFullYear() - child.birth_year

  const chunkingInstruction = {
    temporal: "각 본문 페이지는 반드시 '먼저', '그 다음', '마지막으로' 중 하나의 시간 표지어로 시작하세요.",
    spatial: "각 본문 페이지는 반드시 '[장소]에서,' 형태의 공간 맥락 표지어로 시작하세요.",
    mixed: "각 본문 페이지는 '[장소]에서, 먼저/그 다음/마지막으로' 형태로 시간+공간 표지어를 함께 사용하세요.",
  }[chunkingType]

  const styleInstruction = avatarStyle
    ? `${AVATAR_STYLE_IMAGE_INSTRUCTION[avatarStyle]}, featuring a Korean child named ${child.name}`
    : `colorful children's book illustration featuring a Korean child named ${child.name}`

  return `당신은 ASD(자폐 스펙트럼 장애) 아동을 위한 소셜 스토리 전문 작가입니다.
Carol Gray Social Stories™ 10.4 기준을 엄격히 준수하세요.

## 필수 규칙
1. 문장 비율: 설명문(Descriptive) + 조망문(Perspective) 합계가 지시문(Coaching)의 최소 4배
2. 긍정·칭찬 문장: 전체의 최소 50%
3. 어조: 따뜻하고 인내심 있는 톤, 부정적 표현 절대 금지
4. 청킹: ${chunkingInstruction}
5. 페이지 구성: 도입(intro) 1페이지 + 본문(body) 최대 8페이지 + 결론(conclusion) 1페이지

## 아동 정보
이름: ${child.name}
나이: ${age}세 (${child.age_group} 그룹)
관심사: ${child.interests.join(', ')}
친숙한 환경: ${child.familiar_envs.join(', ')}

## 이미지 프롬프트 지침
모든 image_prompt는 다음 스타일로 작성하세요: ${styleInstruction}
- 장면 상황을 구체적으로 영어로 묘사
- 아동이 장면 안에서 행동하는 모습 포함
- child-safe, no text, no violence 반드시 명시

## 출력 형식 (JSON 배열, 다른 텍스트 없이 JSON만 반환)
[
  {
    "page_number": 1,
    "page_type": "intro",
    "chunking_label": null,
    "descriptive": "설명문 텍스트 (필수)",
    "perspective": "조망문 텍스트 또는 null",
    "coaching": null,
    "image_prompt": "${styleInstruction}, scene description in English, child-safe, no text"
  }
]

지시문(coaching)은 전체 페이지 중 최대 2개 페이지에만 포함하세요.`
}

export function buildStoryGenerationPrompt(sixWh: SixWH, child: Child): string {
  return `다음 6WH 정보를 바탕으로 ${child.name}를 위한 소셜 스토리를 생성하세요.

누가: ${sixWh.who ?? '알 수 없음'}
언제: ${sixWh.when ?? '알 수 없음'}
어디서: ${sixWh.where ?? '알 수 없음'}
무엇을: ${sixWh.what ?? '알 수 없음'}
어떻게: ${sixWh.how ?? '알 수 없음'}
왜: ${sixWh.why ?? '알 수 없음'}`
}

export const AVATAR_STYLE_PROMPTS: Record<string, (age: number, name: string) => string> = {
  ghibli: (age, name) =>
    `Studio Ghibli anime style character illustration of a ${age}-year-old Korean child named ${name}. Warm soft colors, expressive large eyes, gentle smile. White background, high quality character design. Child-safe, wholesome, no text.`,

  realistic: (age, name) =>
    `Warm and friendly realistic portrait illustration of a ${age}-year-old Korean child named ${name}. Professional children's book illustration style, soft lighting, expressive face. White background, high quality.`,

  pixar: (age, name) =>
    `Pixar/Disney 3D animated character of a ${age}-year-old Korean child named ${name}. Big expressive eyes, rounded features, warm lighting. Character concept art style, white background, high quality, child-safe.`,

  watercolor: (age, name) =>
    `Soft watercolor illustration of a ${age}-year-old Korean child named ${name}. Gentle brushstrokes, pastel colors, dreamy and warm aesthetic. White background, hand-painted look, child-safe.`,
}

export const CLARIFYING_QUESTIONS: Record<string, string> = {
  who:   '이야기에 누가 등장하나요? (아이 이름, 친구, 선생님 등)',
  when:  '이 일은 주로 언제 일어나나요? (점심시간, 저녁 등)',
  where: '이 일은 주로 어디에서 일어나나요? (교실, 급식실 등)',
  what:  '어떤 상황인가요? 구체적으로 설명해 주세요.',
  how:   '어떻게 행동하면 좋을까요?',
  why:   '왜 그렇게 행동하는 것이 좋을까요?',
}
