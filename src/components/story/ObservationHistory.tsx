'use client'

import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { OBSERVATION_SETTING_META, RECORDER_ROLE_META, SEAT_META } from '@/types/app.types'
import type { BehaviorObservation } from '@/types/app.types'

interface ObservationHistoryProps {
  observations: BehaviorObservation[]
  loading?: boolean
  onSelect?: (observation: BehaviorObservation) => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function ObservationHistory({ observations, loading, onSelect }: ObservationHistoryProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-pulse text-mint-400 text-3xl">✨</div>
      </div>
    )
  }

  if (observations.length === 0) {
    return (
      <Card className="text-center py-10">
        <p className="text-3xl mb-2">📝</p>
        <p className="font-medium text-charcoal">아직 기록된 행동 관찰이 없어요</p>
        <p className="text-sm text-soft-gray mt-1">새 기록을 작성해 ABC 분석을 시작해 보세요</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {observations.map((obs) => {
        const settingMeta = OBSERVATION_SETTING_META[obs.setting]
        const recorderMeta = RECORDER_ROLE_META[obs.recorder_role]
        return (
          <Card
            key={obs.id}
            hover={!!onSelect}
            onClick={() => onSelect?.(obs)}
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-soft-gray">
                <span>{formatDate(obs.observed_at)}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-xs">
                  {settingMeta.emoji} {settingMeta.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-xs">
                  {recorderMeta.emoji} {recorderMeta.label} 기록
                </span>
              </div>
              {obs.story_id && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lavender-100 text-lavender-700 text-xs font-medium">
                  📖 스토리 연결됨
                </span>
              )}
            </div>

            <p className="text-sm text-charcoal line-clamp-1">
              <span className="font-medium text-coral-600">B</span> · {obs.behavior}
            </p>

            {obs.seat_function.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {obs.seat_function.map((f) => (
                  <span
                    key={f}
                    className={clsx('px-2 py-0.5 rounded-full text-xs font-medium border', SEAT_META[f].bgClass)}
                  >
                    {f} · {SEAT_META[f].label}
                  </span>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
