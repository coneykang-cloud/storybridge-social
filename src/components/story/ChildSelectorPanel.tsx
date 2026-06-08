'use client'

import Image from 'next/image'
import { clsx } from 'clsx'
import type { ChildWithAvatars } from '@/stores/child.store'

const AGE_GROUP_LABEL: Record<string, string> = {
  '5-6':   '미취학',
  '7-9':   '초(저학년)',
  '10-12': '초(고학년)',
  '13-15': '중학생',
  '16-18': '고등학생',
}

interface ChildSelectorPanelProps {
  children: ChildWithAvatars[]
  selectedId: string | null
  onSelect: (child: ChildWithAvatars) => void
}

function ChildAvatar({ child, size }: { child: ChildWithAvatars; size: 'sm' | 'md' }) {
  const avatar = child.avatars?.find((a) => a.is_default) ?? child.avatars?.[0]
  const px = size === 'md' ? 56 : 44

  if (avatar?.image_url) {
    return (
      <Image
        src={avatar.image_url}
        alt={child.name}
        width={px}
        height={px}
        className={clsx(
          'rounded-xl object-cover flex-shrink-0',
          size === 'md' ? 'w-14 h-14' : 'w-11 h-11'
        )}
      />
    )
  }

  return (
    <div className={clsx(
      'rounded-xl bg-mint-100 flex items-center justify-center flex-shrink-0 text-xl',
      size === 'md' ? 'w-14 h-14' : 'w-11 h-11'
    )}>
      🧒
    </div>
  )
}

export function ChildSelectorPanel({ children, selectedId, onSelect }: ChildSelectorPanelProps) {
  return (
    <>
      {/* 모바일: 상단 수평 스크롤 */}
      <div className="md:hidden flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 mb-4">
        {children.map((child) => {
          const isSelected = child.id === selectedId
          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onSelect(child)}
              className={clsx(
                'flex flex-col items-center gap-1.5 flex-shrink-0 p-2 rounded-2xl transition-all',
                isSelected ? 'bg-mint-100 ring-2 ring-mint-400' : 'bg-white border border-gray-100'
              )}
            >
              <ChildAvatar child={child} size="md" />
              <span className={clsx('text-xs font-medium', isSelected ? 'text-mint-700' : 'text-charcoal')}>
                {child.name}
              </span>
              <span className="text-[10px] text-soft-gray">{AGE_GROUP_LABEL[child.age_group]}</span>
            </button>
          )
        })}
      </div>

      {/* PC: 좌측 세로 패널 */}
      <div className="hidden md:flex flex-col w-44 flex-shrink-0 gap-2">
        <p className="text-xs text-soft-gray font-medium px-1 mb-1">아이 선택</p>
        {children.map((child) => {
          const isSelected = child.id === selectedId
          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onSelect(child)}
              className={clsx(
                'flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition-all w-full',
                isSelected
                  ? 'bg-mint-100 ring-2 ring-mint-400'
                  : 'bg-white border border-gray-100 hover:border-mint-200'
              )}
            >
              <ChildAvatar child={child} size="sm" />
              <div className="min-w-0">
                <p className={clsx('font-semibold text-sm truncate', isSelected ? 'text-mint-700' : 'text-charcoal')}>
                  {child.name}
                </p>
                <p className="text-[10px] text-soft-gray">{AGE_GROUP_LABEL[child.age_group]}</p>
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}
