'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { SeatSelector } from './SeatSelector'
import { OBSERVATION_SETTING_META } from '@/types/app.types'
import type {
  BehaviorObservation,
  ObservationSetting,
  SeatFunction,
  SeatAnalysisResult,
  UserRole,
} from '@/types/app.types'

interface ObservationFormProps {
  childId: string
  role: UserRole
  initialData?: Partial<BehaviorObservation>
  onSaved: (observation: BehaviorObservation) => void
  onLinkStory: (observationId: string) => void
}

const SETTINGS: ObservationSetting[] = ['clinic', 'school', 'home']

function toLocalDateTimeValue(iso?: string) {
  const d = iso ? new Date(iso) : new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function ABCLabel({ badge, badgeClass, title, sub }: { badge: string; badgeClass: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className={clsx('w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0', badgeClass)}>
        {badge}
      </span>
      <span className="text-sm font-medium text-charcoal">{title}</span>
      <span className="text-xs text-soft-gray">— {sub}</span>
    </div>
  )
}

export function ObservationForm({ childId, role, initialData, onSaved, onLinkStory }: ObservationFormProps) {
  const isTherapist = role === 'therapist'
  const [observedAt, setObservedAt] = useState(toLocalDateTimeValue(initialData?.observed_at))
  const [setting, setSetting] = useState<ObservationSetting>(initialData?.setting ?? 'clinic')
  const [antecedent, setAntecedent] = useState(initialData?.antecedent ?? '')
  const [behavior, setBehavior] = useState(initialData?.behavior ?? '')
  const [consequence, setConsequence] = useState(initialData?.consequence ?? '')
  const [replacementBehavior, setReplacementBehavior] = useState(initialData?.replacement_behavior ?? '')
  const [seatFunction, setSeatFunction] = useState<SeatFunction[]>(initialData?.seat_function ?? [])
  const [aiResult, setAiResult] = useState<SeatAnalysisResult | null>(null)

  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saved, setSaved] = useState<BehaviorObservation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isValid = !!(antecedent.trim() && behavior.trim() && consequence.trim())
  const canSave = !saved && isValid

  async function saveObservation(): Promise<BehaviorObservation | null> {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          observed_at: new Date(observedAt).toISOString(),
          setting,
          antecedent,
          behavior,
          consequence,
          replacement_behavior: replacementBehavior || undefined,
          seat_function: seatFunction,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? '저장에 실패했어요')
      setSaved(body.observation)
      onSaved(body.observation)
      return body.observation as BehaviorObservation
    } catch (e) {
      setError((e as Error).message)
      return null
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!canSave) return
    await saveObservation()
  }

  async function handleAnalyze() {
    if (!isValid) return
    setAnalyzing(true)
    setError(null)
    try {
      const target = saved ?? (await saveObservation())
      if (!target) return
      const res = await fetch(`/api/observations/${target.id}/analyze`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'AI 분석에 실패했어요')
      setAiResult(body)
      setSeatFunction(body.seat_function ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-charcoal">관찰 일시</p>
        <input
          type="datetime-local"
          value={observedAt}
          onChange={(e) => setObservedAt(e.target.value)}
          disabled={!!saved}
          className="w-full bg-white border-[1.5px] border-gray-200 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-mint-300 transition-colors disabled:opacity-60"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-charcoal">관찰 환경</p>
        <div className="grid grid-cols-3 gap-2">
          {SETTINGS.map((s) => {
            const meta = OBSERVATION_SETTING_META[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSetting(s)}
                disabled={!!saved}
                className={clsx(
                  'flex flex-col items-center gap-1 p-3 rounded-xl border-[1.5px] transition-all disabled:opacity-60',
                  setting === s ? 'border-mint-400 bg-mint-50' : 'border-gray-200 bg-white hover:border-mint-200'
                )}
              >
                <span className="text-xl">{meta.emoji}</span>
                <span className="text-xs font-medium text-charcoal">{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <ABCLabel badge="A" badgeClass="bg-lavender-100 text-lavender-700" title="선행자극 (Antecedent)" sub="행동 직전 상황" />
        <Textarea
          hint="예: 급식 줄에서 친구가 앞에 끼어듦"
          value={antecedent}
          onChange={(e) => setAntecedent(e.target.value)}
          disabled={!!saved}
          className="min-h-[88px]"
        />
      </div>
      <div>
        <ABCLabel badge="B" badgeClass="bg-coral-100 text-coral-600" title="관찰된 행동 (Behavior)" sub="구체적으로 어떤 행동을 했나요" />
        <Textarea
          hint="예: 친구 팔을 손바닥으로 2회 침"
          value={behavior}
          onChange={(e) => setBehavior(e.target.value)}
          disabled={!!saved}
          className="min-h-[88px]"
        />
      </div>
      <div>
        <ABCLabel badge="C" badgeClass="bg-mint-100 text-mint-700" title="결과 (Consequence)" sub="행동 직후 일어난 일" />
        <Textarea
          hint="예: 친구가 뒤로 물러남"
          value={consequence}
          onChange={(e) => setConsequence(e.target.value)}
          disabled={!!saved}
          className="min-h-[88px]"
        />
      </div>
      {isTherapist && (
        <Textarea
          label="대체행동 목표 (선택) · 치료사 전용"
          hint="이 상황에서 대신 가르치고 싶은 행동은 무엇인가요?"
          value={replacementBehavior}
          onChange={(e) => setReplacementBehavior(e.target.value)}
          disabled={!!saved}
          className="min-h-[64px]"
        />
      )}

      {isTherapist && (saved || aiResult) && (
        <SeatSelector
          value={seatFunction}
          onChange={setSeatFunction}
          aiResult={aiResult ?? undefined}
          loading={analyzing}
        />
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {saved && (
        <div className="p-3 bg-mint-50 border border-mint-200 rounded-xl">
          <p className="text-sm text-mint-700 font-medium">✅ 기록이 저장되었어요</p>
          {!isTherapist && (
            <p className="text-xs text-soft-gray mt-0.5">관찰 기록 목록에서 저장된 내용을 확인할 수 있어요.</p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="primary" fullWidth onClick={handleSave} loading={saving} disabled={!canSave || saving}>
          {saved ? '기록 저장됨 ✓' : '기록 저장'}
        </Button>
        {isTherapist && (
          <Button variant="ghost" fullWidth onClick={handleAnalyze} loading={analyzing || saving} disabled={!isValid || analyzing || saving}>
            AI로 행동 기능 분석하기
          </Button>
        )}
      </div>

      {isTherapist && saved && (
        <Button
          variant="cta"
          fullWidth
          className="bg-lavender-400 hover:bg-lavender-500 shadow-none"
          onClick={() => onLinkStory(saved.id)}
        >
          🔗 이 관찰로 Track A 스토리 만들기
        </Button>
      )}
    </Card>
  )
}
