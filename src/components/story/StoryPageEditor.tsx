'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import type { StoryPage } from '@/types/app.types'

interface Props {
  storyId: string
  page: StoryPage
  canEditDirectly: boolean
  canPropose: boolean
}

const FIELDS: { key: 'descriptive' | 'perspective' | 'coaching'; label: string }[] = [
  { key: 'descriptive', label: '설명문' },
  { key: 'perspective', label: '조망문' },
  { key: 'coaching',    label: '지시문' },
]

export function StoryPageEditor({ storyId, page, canEditDirectly, canPropose }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [values, setValues] = useState({
    descriptive: page.descriptive ?? '',
    perspective: page.perspective ?? '',
    coaching: page.coaching ?? '',
  })

  const editable = canEditDirectly || canPropose
  const hasChanges = FIELDS.some(({ key }) => values[key] !== (page[key] ?? ''))

  const handleCancel = () => {
    setValues({
      descriptive: page.descriptive ?? '',
      perspective: page.perspective ?? '',
      coaching: page.coaching ?? '',
    })
    setReason('')
    setEditing(false)
  }

  const handleSave = async () => {
    if (!hasChanges) { setEditing(false); return }
    setIsLoading(true)

    const diff_before: Record<string, string> = {}
    const diff_after: Record<string, string> = {}
    FIELDS.forEach(({ key }) => {
      const before = page[key] ?? ''
      const after = values[key]
      if (before !== after) {
        diff_before[key] = before
        diff_after[key] = after
      }
    })

    const res = await fetch('/api/approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        story_id: storyId,
        page_id: page.id,
        diff_before,
        diff_after,
        ...(canEditDirectly ? {} : { reason: reason.trim() || undefined }),
      }),
    })

    setIsLoading(false)
    if (!res.ok) {
      setMessage('저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
      return
    }

    setEditing(false)
    setReason('')
    if (canEditDirectly) {
      router.refresh()
    } else {
      setMessage('보호자에게 승인 요청을 보냈어요')
    }
  }

  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-xl bg-mint-100 flex items-center justify-center overflow-hidden shrink-0">
          {page.image_url ? (
            <Image
              src={page.image_url}
              alt={`페이지 ${page.page_number}`}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl">📖</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-soft-gray">{page.page_number}페이지</p>
          {!editing && (
            <p className="text-sm text-charcoal line-clamp-2 mt-0.5">{page.descriptive}</p>
          )}
        </div>
        {editable && !editing && (
          <button
            onClick={() => { setMessage(null); setEditing(true) }}
            className="shrink-0 p-1.5 rounded-lg text-soft-gray hover:bg-gray-50 hover:text-charcoal transition-colors"
            aria-label={`${page.page_number}페이지 수정`}
          >
            <Pencil size={16} />
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 space-y-3">
          {FIELDS.map(({ key, label }) => (
            <Textarea
              key={key}
              label={label}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              className="min-h-[80px] text-sm"
              disabled={isLoading}
            />
          ))}
          {!canEditDirectly && (
            <Textarea
              label="제안 사유 (선택)"
              placeholder="이렇게 수정을 제안하는 이유를 적어주세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[60px] text-sm"
              disabled={isLoading}
            />
          )}
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={handleSave}
              loading={isLoading}
              disabled={!hasChanges}
            >
              {canEditDirectly ? '저장' : '수정 제안 보내기'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isLoading}>
              취소
            </Button>
          </div>
        </div>
      )}

      {message && <p className="text-xs text-mint-600 mt-2">{message}</p>}
    </Card>
  )
}
