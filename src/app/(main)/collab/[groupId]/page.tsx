import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CollabPageClient } from './CollabPageClient'
import type { Approval, Comment, Child } from '@/types/app.types'

interface Props { params: Promise<{ groupId: string }> }

export default async function CollabPage({ params }: Props) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: group } = await supabase
    .from('groups')
    .select('id, child_id, invite_code, children(name, age_group)')
    .eq('id', groupId)
    .single()

  if (!group) notFound()

  const child = group.children as unknown as Child

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isParent = profile?.role === 'parent'

  const [membersRes, approvalsRes, historyRes, commentsRes, storiesRes] = await Promise.all([
    supabase
      .from('group_members')
      .select('role, joined_at, user:user_profiles(id, full_name, role)')
      .eq('group_id', groupId),
    supabase
      .from('approvals')
      .select('*, requester:user_profiles(id, full_name, role), story:stories!inner(child_id)')
      .eq('status', 'pending')
      .eq('story.child_id', group.child_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('approvals')
      .select('*, requester:user_profiles(id, full_name, role), story:stories!inner(child_id)')
      .neq('status', 'pending')
      .eq('story.child_id', group.child_id)
      .order('resolved_at', { ascending: false }),
    supabase
      .from('comments')
      .select('*, author:user_profiles(id, full_name, role)')
      .order('created_at', { ascending: true }),
    supabase
      .from('stories')
      .select('id')
      .eq('child_id', group.child_id),
  ])

  const storyIds = (storiesRes.data ?? []).map((s) => s.id as string)

  return (
    <div className="px-5 py-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-charcoal mb-1">협업 공간</h1>
      <p className="text-sm text-soft-gray mb-5">
        {child?.name}의 그룹 · 초대코드:{' '}
        <span className="font-mono font-bold text-mint-600">{group.invite_code}</span>
      </p>

      <CollabPageClient
        groupId={groupId}
        storyIds={storyIds}
        currentUserId={user.id}
        isParent={isParent}
        members={(membersRes.data ?? []) as unknown as { role: string; joined_at: string; user: { id: string; full_name: string; role: string } }[]}
        initialApprovals={(approvalsRes.data ?? []) as Approval[]}
        initialApprovalHistory={(historyRes.data ?? []) as Approval[]}
        initialComments={(commentsRes.data ?? []) as Comment[]}
      />
    </div>
  )
}
