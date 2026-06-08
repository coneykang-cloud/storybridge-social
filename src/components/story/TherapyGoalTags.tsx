'use client'

import { clsx } from 'clsx'
import { THERAPY_GOAL_OPTIONS } from '@/types/app.types'

interface TherapyGoalTagsProps {
  selected: string[]
  onChange: (tags: string[]) => void
}

export function TherapyGoalTags({ selected, onChange }: TherapyGoalTagsProps) {
  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    )
  }

  return (
    <div>
      <p className="text-sm font-medium text-charcoal mb-2">🎯 치료 목표 연결 <span className="text-soft-gray font-normal">(선택)</span></p>
      <div className="flex flex-wrap gap-2">
        {THERAPY_GOAL_OPTIONS.map((tag) => {
          const isSelected = selected.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                isSelected
                  ? 'bg-lavender-300 text-charcoal shadow-sm'
                  : 'bg-white border border-lavender-200 text-charcoal hover:bg-lavender-100'
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
