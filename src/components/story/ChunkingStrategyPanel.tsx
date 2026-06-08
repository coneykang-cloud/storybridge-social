'use client'

import { Lock, Pencil, Star } from 'lucide-react'
import { clsx } from 'clsx'
import { CHUNKING_TYPE_META, PRESENTATION_MODE_META } from '@/types/app.types'
import type { ChunkingType, PresentationMode } from '@/types/app.types'

interface ChunkingStrategyPanelProps {
  chunkingType: ChunkingType
  presentationMode: PresentationMode
  canEdit: boolean
  onChange?: (type: ChunkingType, mode: PresentationMode) => void
  className?: string
}

export function ChunkingStrategyPanel({
  chunkingType,
  presentationMode,
  canEdit,
  onChange,
  className,
}: ChunkingStrategyPanelProps) {
  const handleTypeChange = (type: ChunkingType) => {
    if (!canEdit || !onChange) return
    onChange(type, presentationMode)
  }

  const handleModeChange = (mode: PresentationMode) => {
    if (!canEdit || !onChange) return
    onChange(chunkingType, mode)
  }

  return (
    <div className={clsx('bg-white border border-gray-100 rounded-2xl p-4 space-y-4', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
          📊 청킹 전략 설정
        </span>
        <span className={clsx(
          'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg',
          canEdit ? 'bg-lavender-100 text-lavender-600' : 'bg-gray-100 text-soft-gray'
        )}>
          {canEdit ? <><Pencil size={10} /> 수정 가능</> : <><Lock size={10} /> 열람만</>}
        </span>
      </div>

      {/* 청킹 유형 */}
      <div>
        <p className="text-xs text-soft-gray font-medium mb-2">청킹 유형</p>
        <div className="space-y-2">
          {(Object.keys(CHUNKING_TYPE_META) as ChunkingType[]).map((type) => {
            const meta = CHUNKING_TYPE_META[type]
            const isSelected = chunkingType === type
            return (
              <button
                key={type}
                type="button"
                disabled={!canEdit}
                onClick={() => handleTypeChange(type)}
                className={clsx(
                  'w-full flex items-start gap-3 p-2.5 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-mint-400 bg-mint-50'
                    : 'border-gray-100 hover:border-gray-200',
                  !canEdit && 'opacity-70 cursor-default'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors',
                  isSelected ? 'border-mint-500 bg-mint-500' : 'border-gray-300'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-charcoal">{meta.label}</span>
                    {meta.isDefault && (
                      <Star size={12} className="text-warning-amber fill-warning-amber" />
                    )}
                    <span className="text-xs text-soft-gray ml-auto">{meta.efScore}</span>
                  </div>
                  <p className="text-xs text-soft-gray mt-0.5">{meta.example}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 제시 방식 */}
      <div>
        <p className="text-xs text-soft-gray font-medium mb-2">제시 방식</p>
        <div className="space-y-2">
          {(Object.keys(PRESENTATION_MODE_META) as PresentationMode[]).map((mode) => {
            const meta = PRESENTATION_MODE_META[mode]
            const isSelected = presentationMode === mode
            return (
              <button
                key={mode}
                type="button"
                disabled={!canEdit}
                onClick={() => handleModeChange(mode)}
                className={clsx(
                  'w-full flex items-start gap-3 p-2.5 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-mint-400 bg-mint-50'
                    : 'border-gray-100 hover:border-gray-200',
                  !canEdit && 'opacity-70 cursor-default'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors',
                  isSelected ? 'border-mint-500 bg-mint-500' : 'border-gray-300'
                )} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-charcoal">{meta.label}</span>
                    {meta.isDefault && (
                      <Star size={12} className="text-warning-amber fill-warning-amber" />
                    )}
                  </div>
                  <p className="text-xs text-soft-gray mt-0.5">{meta.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 추천 문구 */}
      <div className="bg-warning-amber/10 border border-warning-amber/30 rounded-xl p-3">
        <p className="text-xs text-charcoal leading-relaxed">
          <Star size={11} className="inline text-warning-amber fill-warning-amber mr-1" />
          <strong>'혼합 청킹 + 누적 제시'</strong> → 연구기반 가장 강력한 조합
          <span className="text-soft-gray ml-1">(EF M=80.64, 강현정 2026)</span>
        </p>
      </div>
    </div>
  )
}
