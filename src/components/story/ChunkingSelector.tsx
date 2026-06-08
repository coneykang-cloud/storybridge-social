'use client'

import { clsx } from 'clsx'
import type { ChunkingType } from '@/types/app.types'

const OPTIONS: { value: ChunkingType; label: string; desc: string; example: string }[] = [
  {
    value: 'temporal',
    label: '시간적 청킹',
    desc: '사건을 시간 순서로 분절',
    example: '먼저 → 그 다음 → 마지막으로',
  },
  {
    value: 'spatial',
    label: '공간적 청킹',
    desc: '장소 맥락에 따라 분절',
    example: '교실에서 → 복도에서 → 급식실에서',
  },
  {
    value: 'mixed',
    label: '혼합 청킹',
    desc: '시간 + 공간 표지어 동시 사용',
    example: '급식실에서, 먼저 → 그 다음',
  },
]

interface ChunkingSelectorProps {
  value: ChunkingType
  onChange: (value: ChunkingType) => void
}

export function ChunkingSelector({ value, onChange }: ChunkingSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-charcoal">청킹 방식 선택</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              'text-left p-3 rounded-xl border-[1.5px] transition-all',
              value === opt.value
                ? 'border-mint-400 bg-mint-50 shadow-mint'
                : 'border-gray-200 bg-white hover:border-mint-200'
            )}
          >
            <div className="font-medium text-sm text-charcoal">{opt.label}</div>
            <div className="text-xs text-soft-gray mt-0.5">{opt.desc}</div>
            <div className="text-xs text-mint-600 mt-1 font-medium">{opt.example}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
