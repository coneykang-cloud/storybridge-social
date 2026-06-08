'use client'

import { clsx } from 'clsx'
import type { StoryPage } from '@/types/app.types'

interface DiffViewerProps {
  before: Partial<StoryPage>
  after: Partial<StoryPage>
}

const FIELDS: { key: keyof StoryPage; label: string }[] = [
  { key: 'descriptive', label: '설명문' },
  { key: 'perspective', label: '조망문' },
  { key: 'coaching',    label: '지시문' },
]

export function DiffViewer({ before, after }: DiffViewerProps) {
  const hasChanges = FIELDS.some((f) => before[f.key] !== after[f.key])

  if (!hasChanges) {
    return <p className="text-sm text-soft-gray text-center py-4">변경 내용이 없어요</p>
  }

  return (
    <div className="space-y-3">
      {FIELDS.map(({ key, label }) => {
        const bVal = before[key] as string | undefined
        const aVal = after[key] as string | undefined
        if (bVal === aVal) return null

        return (
          <div key={key} className="text-sm">
            <p className="font-medium text-charcoal mb-1">{label}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className={clsx('p-3 rounded-lg', bVal ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200')}>
                <p className="text-xs text-red-500 font-medium mb-1">변경 전</p>
                <p className="text-charcoal leading-relaxed">{bVal ?? '(없음)'}</p>
              </div>
              <div className={clsx('p-3 rounded-lg', aVal ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200')}>
                <p className="text-xs text-success-green font-medium mb-1">변경 후</p>
                <p className="text-charcoal leading-relaxed">{aVal ?? '(없음)'}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
