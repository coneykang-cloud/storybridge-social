import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { StoryPage } from '@/types/app.types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// 승인된 수정 내용을 story_pages에 반영
async function applyDiffToPage(
  supabase: SupabaseClient,
  pageId: string,
  diffAfter: Record<string, unknown>
) {
  await supabase.from('story_pages').update(diffAfter).eq('id', pageId)
}

// 알림 생성 (RLS 우회 — 수신자가 본인이 아닐 수 있음)
async function notifyUser(payload: {
  user_id: string
  type: 'approval_request' | 'approval_result' | 'approval_sent'
  title: string
  body: string
  story_id?: string
}) {
  const serviceClient = await createServiceClient()
  await serviceClient.from('notifications').insert(payload)
}

const FIELD_LABELS: Record<string, string> = {
  descriptive: '설명문',
  perspective: '조망문',
  coaching: '지시문',
}

function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}...` : text
}

// 변경된 필드를 사람이 읽을 수 있는 한 줄 요약으로 변환 (알림 본문용)
function summarizeDiff(diff: Partial<StoryPage>): string {
  return Object.entries(diff)
    .filter(([key]) => key in FIELD_LABELS)
    .map(([key, value]) => `[${FIELD_LABELS[key]}] ${truncate(String(value))}`)
    .join(' / ')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { story_id, page_id, diff_before, diff_after, reason } = await request.json()

  const { data: story } = await supabase
    .from('stories')
    .select('creator_id, track, children(parent_id)')
    .eq('id', story_id)
    .single()

  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 })

  const parentId = (story.children as unknown as { parent_id: string } | null)?.parent_id

  // 본인이 생성한 스토리 수정, 또는 보호자(최종 승인권자)의 수정은 승인 절차 없이 즉시 반영
  const canEditDirectly = user.id === story.creator_id || user.id === parentId

  const { data: approval, error } = await supabase
    .from('approvals')
    .insert({
      story_id,
      page_id: page_id ?? null,
      requester_id: user.id,
      track: story.track,
      status: canEditDirectly ? 'approved' : 'pending',
      diff_before,
      diff_after,
      proposal_reason: reason ?? null,
      ...(canEditDirectly ? { resolved_at: new Date().toISOString() } : {}),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (canEditDirectly) {
    if (page_id) await applyDiffToPage(supabase, page_id, diff_after)
  } else {
    if (parentId) {
      const { data: requesterProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const requesterName = requesterProfile?.full_name ?? '전문가'
      await notifyUser({
        user_id: parentId,
        type: 'approval_request',
        title: '수정 제안',
        body: reason
          ? `${requesterName}님이 스토리 수정을 제안했어요: ${reason}`
          : `${requesterName}님이 스토리 수정을 제안했어요`,
        story_id,
      })
    }

    // 제안을 보낸 사람도 본인 알림함에서 진행 상태를 추적할 수 있도록
    const diffSummary = summarizeDiff(diff_after as Partial<StoryPage>)
    await notifyUser({
      user_id: user.id,
      type: 'approval_sent',
      title: '제안을 보냈어요',
      body: diffSummary
        ? `${diffSummary} (보호자 승인 대기중)`
        : '보호자에게 수정 제안을 보냈어요 (승인 대기중)',
      story_id,
    })
  }

  return NextResponse.json({ approval })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status, feedback } = await request.json()

  // 보호자 권한 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'parent') {
    return NextResponse.json({ error: 'Only parents can approve' }, { status: 403 })
  }

  const { data: approval } = await supabase
    .from('approvals')
    .select('*, story:stories(child_id, children(parent_id))')
    .eq('id', id)
    .single()

  if (!approval) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {
    status,
    resolved_at: new Date().toISOString(),
    ...(feedback ? { feedback } : {}),
  }

  const { data: updated } = await supabase
    .from('approvals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  // 승인 시 페이지 실제 업데이트
  if (status === 'approved' && approval.page_id) {
    await applyDiffToPage(supabase, approval.page_id, approval.diff_after)
  }

  const diffSummary = summarizeDiff((approval.diff_after ?? {}) as Partial<StoryPage>)

  await notifyUser({
    user_id: approval.requester_id,
    type: 'approval_result',
    title: status === 'approved' ? '제안이 승인됐어요' : '제안이 거절됐어요',
    body: status === 'approved'
      ? (diffSummary ? `${diffSummary} → 반영됐어요` : '보호자가 수정 제안을 승인했어요')
      : (feedback || (diffSummary ? `${diffSummary} 제안이 거절됐어요` : '보호자가 수정 제안을 거절했어요')),
    story_id: approval.story_id,
  })

  return NextResponse.json({ approval: updated })
}
