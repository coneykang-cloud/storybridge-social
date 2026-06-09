'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { RoleBadge } from '@/components/ui/Badge'
import { ApprovalCard } from '@/components/collab/ApprovalCard'
import { CommentThread } from '@/components/collab/CommentThread'
import { useCollabStore } from '@/stores/collab.store'
import type { Approval, Comment } from '@/types/app.types'

interface Member {
  role: string
  joined_at: string
  user: { id: string; full_name: string; role: string }
}

interface Props {
  groupId: string
  childId: string
  currentUserId: string
  isParent: boolean
  members: Member[]
  initialApprovals: Approval[]
  initialComments: Comment[]
}

type TabKey = 'approvals' | 'comments' | 'members'

export function CollabPageClient({
  groupId, childId, currentUserId, isParent,
  members, initialApprovals, initialComments,
}: Props) {
  const {
    pendingApprovals, comments,
    setPendingApprovals, setComments, addComment,
    connectToGroup, disconnectFromGroup,
  } = useCollabStore()

  const [tab, setTab] = useState<TabKey>(isParent && initialApprovals.length > 0 ? 'approvals' : 'comments')

  useEffect(() => {
    setPendingApprovals(initialApprovals)
    setComments(initialComments)
    connectToGroup(groupId, childId)
    return () => disconnectFromGroup()
  }, [groupId])

  const handleCommentAdd = async (content: string) => {
    const res = await fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: null, content }),
    })
    if (res.ok) {
      const { comment } = await res.json()
      addComment(comment)
    }
  }

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'approvals', label: '승인 요청', badge: isParent ? pendingApprovals.length : undefined },
    { key: 'comments',  label: '자문 댓글' },
    { key: 'members',   label: '멤버' },
  ]

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex border-b border-gray-100">
        {tabs.map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? 'text-mint-700 border-b-2 border-mint-400'
                : 'text-soft-gray hover:text-charcoal'
            }`}
          >
            {label}
            {badge ? (
              <span className="absolute top-1.5 right-3 text-[10px] bg-coral-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* 승인 탭 */}
      {tab === 'approvals' && (
        <div className="space-y-3">
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-medium text-charcoal">대기 중인 승인 요청이 없어요</p>
            </div>
          ) : (
            pendingApprovals.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} isParent={isParent} />
            ))
          )}
        </div>
      )}

      {/* 댓글 탭 */}
      {tab === 'comments' && (
        <div className="h-[60vh]">
          <CommentThread
            storyId={groupId}
            comments={comments}
            currentUserId={currentUserId}
            onCommentAdd={handleCommentAdd}
          />
        </div>
      )}

      {/* 멤버 탭 */}
      {tab === 'members' && (
        <div className="space-y-2">
          {members.map((member) => (
            <Card key={member.user.id} padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-mint-100 flex items-center justify-center">
                    <Users size={16} className="text-mint-600" />
                  </div>
                  <span className="font-medium text-sm text-charcoal">{member.user.full_name}</span>
                </div>
                <RoleBadge role={member.user.role as import('@/types/app.types').UserRole} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
