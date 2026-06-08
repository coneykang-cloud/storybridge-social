import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { story_id, page_id, diff_before, diff_after } = await request.json()

  const { data: approval, error } = await supabase
    .from('approvals')
    .insert({
      story_id,
      page_id: page_id ?? null,
      requester_id: user.id,
      status: 'pending',
      diff_before,
      diff_after,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
    await supabase
      .from('story_pages')
      .update(approval.diff_after)
      .eq('id', approval.page_id)
  }

  return NextResponse.json({ approval: updated })
}

