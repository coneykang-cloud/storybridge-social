'use client'

import { Card } from '@/components/ui/Card'
import { Badge, RoleBadge } from '@/components/ui/Badge'
import { DiffViewer } from './DiffViewer'
import type { Approval } from '@/types/app.types'

interface ApprovalHistoryCardProps {
  approval: Approval
}

export function ApprovalHistoryCard({ approval }: ApprovalHistoryCardProps) {
  const requester = approval.requester
  const isApproved = approval.status === 'approved'

  return (
    <Card className={isApproved ? 'border-mint-300/60 bg-mint-50/40' : 'border-red-200 bg-red-50/40'}>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-charcoal">
              {requester?.full_name ?? '전문가'}
            </span>
            {requester?.role && <RoleBadge role={requester.role} />}
            <Badge
              className={isApproved ? 'bg-mint-100 text-mint-700' : 'bg-red-100 text-red-600'}
            >
              {isApproved ? '✅ 승인됨' : '❌ 거절됨'}
            </Badge>
          </div>
          <p className="text-xs text-soft-gray">수정 제안을 보냈어요</p>
        </div>
        {approval.resolved_at && (
          <span className="text-xs text-soft-gray">
            {new Date(approval.resolved_at).toLocaleDateString('ko-KR')}
          </span>
        )}
      </div>

      {/* Diff (읽기 전용) */}
      <DiffViewer before={approval.diff_before} after={approval.diff_after} />

      {/* 제안 사유 */}
      {approval.proposal_reason && (
        <div className="mt-3 p-3 rounded-lg bg-mint-50 border border-mint-200">
          <p className="text-xs text-mint-700 font-medium mb-1">제안 사유</p>
          <p className="text-sm text-charcoal leading-relaxed">{approval.proposal_reason}</p>
        </div>
      )}

      {/* 거절 사유 */}
      {!isApproved && approval.feedback && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-xs text-red-500 font-medium mb-1">거절 사유</p>
          <p className="text-sm text-charcoal leading-relaxed">{approval.feedback}</p>
        </div>
      )}
    </Card>
  )
}
