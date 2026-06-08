'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { RoleBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import type { Comment } from '@/types/app.types'

interface CommentThreadProps {
  storyId: string
  comments: Comment[]
  currentUserId: string
  onCommentAdd: (content: string) => Promise<void>
}

export function CommentThread({ storyId, comments, currentUserId, onCommentAdd }: CommentThreadProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!content.trim()) return
    setIsSending(true)
    await onCommentAdd(content.trim())
    setContent('')
    setIsSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 댓글 목록 */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {comments.length === 0 && (
          <p className="text-sm text-soft-gray text-center py-8">
            아직 댓글이 없어요. 첫 번째 자문을 남겨보세요!
          </p>
        )}
        {comments.map((comment) => {
          const isMine = comment.author_id === currentUserId
          return (
            <div key={comment.id} className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-soft-gray">
                  {comment.author?.full_name ?? ''}
                </span>
                {comment.author?.role && (
                  <RoleBadge role={comment.author.role} className="text-[10px] px-1.5 py-0" />
                )}
              </div>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMine
                    ? 'bg-mint-300 text-charcoal rounded-tr-sm'
                    : 'bg-white border border-gray-100 text-charcoal rounded-tl-sm shadow-sm'
                }`}
              >
                {comment.content}
              </div>
              <span className="text-[10px] text-soft-gray">
                {new Date(comment.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                {isMine && <span className="ml-1">{comment.is_read ? '✓✓' : '✓'}</span>}
              </span>
            </div>
          )
        })}
      </div>

      {/* 입력창 */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <Textarea
          placeholder="자문 의견을 입력하세요..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[60px] text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
          }}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleSend}
          loading={isSending}
          disabled={!content.trim()}
          className="self-end min-w-[48px]"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  )
}
