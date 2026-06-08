import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/openai/client'

const SEAT_SYSTEM_PROMPT = `당신은 ABA(응용행동분석) 전문가입니다. 다음 ABC 행동 관찰 데이터를 SEAT 기능 분석 틀에 따라 분류하고, 대체행동 목표를 제안하세요.

SEAT 기능 분류:
- S (Sensory/감각): 특정 감각 입력에 반응하거나 자기자극을 취하려는 행동
- E (Escape/도피): 어려운 과제나 불쾌한 상황에서 벗어나려는 행동
- A (Attention/관심): 특정인의 주의나 관심을 얻으려는 행동
- T (Tangible/유형): 특정 물건이나 원하는 활동을 얻으려는 행동

중요: 복수의 기능이 동시에 작용할 수 있습니다.

대체행동 제안 시 유의사항:
- 분류된 SEAT 기능과 동일한 기능(예: 관심을 얻고 싶은 욕구)을 더 적응적인 방식으로 충족시키는 행동이어야 합니다.
- 아이의 현재 능력 수준에서 곧바로 가르칠 수 있을 만큼 구체적이고 실행 가능해야 합니다.
- 어디까지나 초안 제안이며, 최종 목표는 치료사가 아이의 개별 맥락에 맞게 검토·수정한다는 점을 전제로 작성하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "seat_function": ["S"|"E"|"A"|"T"],
  "confidence": 0.0~1.0,
  "rationale": "분류 근거를 한국어로 2~3문장으로 설명",
  "replacement_behavior_suggestion": "대체행동 목표 제안을 한국어로 1~2문장으로 작성"
}`

/* ── POST /api/observations/[id]/analyze ────────────────────── */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'therapist')
    return NextResponse.json({ error: '치료사만 접근 가능합니다.' }, { status: 403 })

  // 관찰 기록 조회 (RLS가 본인 기록 또는 접근 권한이 있는 아이의 기록으로 범위를 제한함)
  const { data: obs, error: fetchErr } = await supabase
    .from('behavior_observations')
    .select('antecedent, behavior, consequence')
    .eq('id', id)
    .single()

  if (fetchErr || !obs)
    return NextResponse.json({ error: '관찰 기록을 찾을 수 없습니다.' }, { status: 404 })

  // GPT-4o SEAT 분류
  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SEAT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `A(선행자극): ${obs.antecedent}\nB(행동): ${obs.behavior}\nC(결과): ${obs.consequence}`,
        },
      ],
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw)

    // seat_function 자동 업데이트 (RLS의 observations_update_with_access 정책이
    // 본인 기록 또는 접근 권한이 있는 아이의 기록에 한해 허용함)
    await supabase
      .from('behavior_observations')
      .update({ seat_function: result.seat_function ?? [] })
      .eq('id', id)

    return NextResponse.json({
      seat_function: result.seat_function ?? [],
      confidence: result.confidence ?? 0,
      rationale: result.rationale ?? '',
      replacement_behavior_suggestion: result.replacement_behavior_suggestion ?? '',
    })
  } catch (err) {
    console.error('SEAT AI 분석 오류:', err)
    return NextResponse.json({ error: 'AI 분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
