'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { RoleBadge } from '@/components/ui/Badge'
import { DiffViewer } from './DiffViewer'
import { Textarea } from '@/components/ui/Input'
import { useCollabStore } from '@/stores/collab.store'
import type { Approval } from '@/types/app.types'

interface ApprovalCardProps {
  approval: Approval
  isParent: boolean
}

export function ApprovalCard({ approval, isParent }: ApprovalCardProps) {
  const { resolveApproval } = useCollabStore()
  const [showReject, setShowReject] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const requester = approval.requester

  const handleApprove = async () => {
    setIsLoading(true)
    await resolveApproval(approval.id, 'approved')
    setIsLoading(false)
  }

  const handleReject = async () => {
    if (!feedback.trim()) return
    setIsLoading(true)
    await resolveApproval(approval.id, 'rejected', feedback)
    setIsLoading(false)
    setShowReject(false)
  }

  return (
    <Card className="border-warning-amber/40 bg-warning-amber/5">
      {/* 어느 스토리/페이지에 대한 제안인지 */}
      {(approval.story?.title || approval.page?.page_number) && (
        <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-warning-amber/20">
          <span className="text-sm">📖</span>
          <span className="text-xs font-medium text-charcoal break-keep">
            {approval.story?.title}
            {approval.page?.page_number && ` · ${approval.page.page_number}페이지`}
          </span>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-charcoal">
              {requester?.full_name ?? '전문가'}
            </span>
            {requester?.role && <RoleBadge role={requester.role} />}
          </div>
          <p className="text-xs text-soft-gray">수정 제안을 보냈어요</p>
        </div>
        <span className="text-xs text-soft-gray">
          {new Date(approval.created_at).toLocaleDateString('ko-KR')}
        </span>
      </div>

      {/* Diff */}
      <DiffViewer before={approval.diff_before} after={approval.diff_after} />

      {/* 제안 사유 */}
      {approval.proposal_reason && (
        <div className="mt-3 p-3 rounded-lg bg-mint-50 border border-mint-200">
          <p className="text-xs text-mint-700 font-medium mb-1">제안 사유</p>
          <p className="text-sm text-charcoal leading-relaxed">{approval.proposal_reason}</p>
        </div>
      )}

      {/* 보호자 전용 승인/거절 버튼 */}
      {isParent && (
        <div className="mt-4 space-y-2">
          {!showReject ? (
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 gap-1"
                onClick={handleApprove}
                loading={isLoading}
              >
                <Check size={16} /> 승인
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-1 border-red-300 text-red-500 hover:bg-red-50"
                onClick={() => setShowReject(true)}
              >
                <X size={16} /> 거절
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                placeholder="거절 사유를 적어주세요 (전문가에게 전달돼요)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  onClick={handleReject}
                  loading={isLoading}
                  disabled={!feedback.trim()}
                >
                  거절 전송
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReject(false)}
                >
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
