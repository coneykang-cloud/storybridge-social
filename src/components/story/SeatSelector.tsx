'use client'

import { clsx } from 'clsx'
import { SEAT_META } from '@/types/app.types'
import type { SeatFunction, SeatAnalysisResult } from '@/types/app.types'

const ORDER: SeatFunction[] = ['S', 'E', 'A', 'T']

interface SeatSelectorProps {
  value: SeatFunction[]
  onChange: (value: SeatFunction[]) => void
  aiResult?: Pick<SeatAnalysisResult, 'seat_function' | 'rationale' | 'confidence'>
  loading?: boolean
}

export function SeatSelector({ value, onChange, aiResult, loading }: SeatSelectorProps) {
  function toggle(f: SeatFunction) {
    onChange(value.includes(f) ? value.filter((v) => v !== f) : [...value, f])
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-charcoal">행동 기능 분류 (SEAT)</p>
      <div className="grid grid-cols-2 gap-2">
        {ORDER.map((f) => {
          const meta = SEAT_META[f]
          const selected = value.includes(f)
          const recommended = aiResult?.seat_function.includes(f)
          return (
            <button
              key={f}
              type="button"
              onClick={() => toggle(f)}
              disabled={loading}
              title={recommended ? aiResult?.rationale : undefined}
              className={clsx(
                'text-left p-3 rounded-xl border-[1.5px] transition-all',
                selected
                  ? 'border-lavender-400 bg-lavender-100'
                  : 'border-gray-200 bg-white hover:border-lavender-200'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm text-charcoal">{f} · {meta.label}</span>
                {recommended && <span aria-label="AI 추천">⭐</span>}
              </div>
              <p className="text-xs text-soft-gray mt-0.5">{meta.desc}</p>
            </button>
          )
        })}
      </div>
      {loading && <p className="text-xs text-soft-gray">AI가 행동 기능을 분석하고 있어요...</p>}
      {aiResult && !loading && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <p className="text-xs text-amber-800">
            <span className="font-medium">AI 분석 근거:</span> {aiResult.rationale}
          </p>
          <p className="text-xs text-amber-600">
            신뢰도 {Math.round(aiResult.confidence * 100)}% · 최종 판단은 치료사가 직접 확인해 주세요
          </p>
        </div>
      )}
    </div>
  )
}
