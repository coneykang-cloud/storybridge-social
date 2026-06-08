'use client'

import { clsx } from 'clsx'
import { SCHOOL_CONTEXT_OPTIONS } from '@/types/app.types'

interface SchoolContextTagsProps {
  selected: string[]
  onChange: (tags: string[]) => void
}

export function SchoolContextTags({ selected, onChange }: SchoolContextTagsProps) {
  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    )
  }

  return (
    <div>
      <p className="text-sm font-medium text-charcoal mb-2">🏫 학교 맥락 태그 <span className="text-soft-gray font-normal">(선택)</span></p>
      <div className="flex flex-wrap gap-2">
        {SCHOOL_CONTEXT_OPTIONS.map((tag) => {
          const isSelected = selected.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                isSelected
                  ? 'bg-orange-100 text-charcoal border border-orange-300 shadow-sm'
                  : 'bg-white border border-orange-200 text-charcoal hover:bg-orange-50'
              )}
            >
              {isSelected && <span className="mr-1">✓</span>}
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
