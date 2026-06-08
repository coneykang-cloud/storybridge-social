'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { SeatSelector } from '@/components/story/SeatSelector'
import { OBSERVATION_SETTING_META, RECORDER_ROLE_META, SEAT_META } from '@/types/app.types'
import type { BehaviorObservation, ObservationSetting, SeatAnalysisResult, SeatFunction, UserRole } from '@/types/app.types'

interface ObservationDetailClientProps {
  observationId: string
  role: UserRole
  userId: string
}

const SETTINGS: ObservationSetting[] = ['clinic', 'school', 'home']

function toLocalDateTimeValue(iso: string) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function ABCBlock({ badge, badgeClass, title, value }: { badge: string; badgeClass: string; title: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={clsx('w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0', badgeClass)}>
          {badge}
        </span>
        <span className="text-sm font-medium text-charcoal">{title}</span>
      </div>
      <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap pl-8">{value}</p>
    </div>
  )
}

export function ObservationDetailClient({ observationId, role, userId }: ObservationDetailClientProps) {
  const router = useRouter()
  const isTherapist = role === 'therapist'

  const [observation, setObservation] = useState<BehaviorObservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [addingAnalysis, setAddingAnalysis] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 수정용 입력 상태
  const [observedAt, setObservedAt] = useState('')
  const [setting, setSetting] = useState<ObservationSetting>('clinic')
  const [antecedent, setAntecedent] = useState('')
  const [behavior, setBehavior] = useState('')
  const [consequence, setConsequence] = useState('')
  const [replacementBehavior, setReplacementBehavior] = useState('')
  const [seatFunction, setSeatFunction] = useState<SeatFunction[]>([])
  const [aiResult, setAiResult] = useState<SeatAnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const isOwner = observation?.recorder_id === userId

  useEffect(() => {
    setLoading(true)
    fetch(`/api/observations/${observationId}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? '관찰 기록을 불러오지 못했어요')
        setObservation(body.observation)
        loadIntoForm(body.observation)
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [observationId])

  function loadIntoForm(obs: BehaviorObservation) {
    setObservedAt(toLocalDateTimeValue(obs.observed_at))
    setSetting(obs.setting)
    setAntecedent(obs.antecedent)
    setBehavior(obs.behavior)
    setConsequence(obs.consequence)
    setReplacementBehavior(obs.replacement_behavior ?? '')
    setSeatFunction(obs.seat_function ?? [])
  }

  function startEdit() {
    if (!observation) return
    loadIntoForm(observation)
    setEditing(true)
  }

  function startAnalysis() {
    if (!observation) return
    setReplacementBehavior(observation.replacement_behavior ?? '')
    setSeatFunction(observation.seat_function ?? [])
    setAiResult(null)
    setAddingAnalysis(true)
  }

  async function handleAnalyze() {
    if (!observation) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch(`/api/observations/${observationId}/analyze`, { method: 'POST' })
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

  async function handleSaveAnalysis() {
    if (!observation) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/observations/${observationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replacement_behavior: replacementBehavior || null,
          seat_function: seatFunction,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? '저장에 실패했어요')
      setObservation(body.observation)
      setAddingAnalysis(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const isValid = !!(antecedent.trim() && behavior.trim() && consequence.trim())

  async function handleSaveEdit() {
    if (!observation || !isValid) return
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        observed_at: new Date(observedAt).toISOString(),
        setting,
        antecedent,
        behavior,
        consequence,
      }
      if (isTherapist) {
        payload.replacement_behavior = replacementBehavior || null
        payload.seat_function = seatFunction
      }
      const res = await fetch(`/api/observations/${observationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? '수정에 실패했어요')
      setObservation(body.observation)
      setEditing(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/observations/${observationId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? '삭제에 실패했어요')
      }
      router.push('/observations')
    } catch (e) {
      setError((e as Error).message)
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-40"><div className="animate-pulse text-mint-400 text-4xl">✨</div></div>
  }

  if (error && !observation) {
    return (
      <div className="text-center py-10">
        <p className="text-3xl mb-2">😥</p>
        <p className="font-medium text-charcoal mb-1">{error}</p>
        <Button variant="ghost" className="mt-3" onClick={() => router.push('/observations')}>목록으로 돌아가기</Button>
      </div>
    )
  }

  if (!observation) return null

  const settingMeta = OBSERVATION_SETTING_META[observation.setting]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/observations')} className="text-sm text-soft-gray">← 목록으로</button>
        <h1 className="text-xl font-bold text-charcoal">관찰 기록 상세</h1>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!editing && !addingAnalysis ? (
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-soft-gray">
              <span>{formatDate(observation.observed_at)}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-xs">
                {settingMeta.emoji} {settingMeta.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-xs">
                {RECORDER_ROLE_META[observation.recorder_role].emoji} {RECORDER_ROLE_META[observation.recorder_role].label}
                {isOwner ? ' (나) ' : ' '}기록
              </span>
            </div>
            {observation.story_id && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lavender-100 text-lavender-700 text-xs font-medium">
                📖 스토리 연결됨
              </span>
            )}
          </div>

          <ABCBlock badge="A" badgeClass="bg-lavender-100 text-lavender-700" title="선행자극 (Antecedent)" value={observation.antecedent} />
          <ABCBlock badge="B" badgeClass="bg-coral-100 text-coral-600" title="관찰된 행동 (Behavior)" value={observation.behavior} />
          <ABCBlock badge="C" badgeClass="bg-mint-100 text-mint-700" title="결과 (Consequence)" value={observation.consequence} />

          {isTherapist && observation.replacement_behavior && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-charcoal">대체행동 목표 · 치료사 전용</p>
              <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">{observation.replacement_behavior}</p>
            </div>
          )}

          {isTherapist && observation.seat_function.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-charcoal">행동 기능 (SEAT) · 치료사 전용</p>
              <div className="flex flex-wrap gap-1.5">
                {observation.seat_function.map((f) => (
                  <span key={f} className={clsx('px-2 py-0.5 rounded-full text-xs font-medium border', SEAT_META[f].bgClass)}>
                    {f} · {SEAT_META[f].label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isOwner ? (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={startEdit}>✏️ 수정하기</Button>
              <Button variant="ghost" fullWidth className="border-red-300 text-red-500 hover:bg-red-50" onClick={() => setConfirmingDelete(true)}>
                🗑 삭제하기
              </Button>
            </div>
          ) : isTherapist ? (
            <div className="pt-2 space-y-2">
              <Button variant="secondary" fullWidth onClick={startAnalysis}>
                🩺 {observation.seat_function.length > 0 || observation.replacement_behavior ? '치료 소견 수정하기' : '치료 소견 추가하기'}
              </Button>
              <p className="text-xs text-soft-gray text-center">
                다른 분이 작성한 ABC 기록은 그대로 두고, SEAT 분류·대체행동 목표만 추가·수정할 수 있어요.
              </p>
            </div>
          ) : null}

          {isTherapist && !observation.story_id && (
            <Button
              variant="cta"
              fullWidth
              className="bg-lavender-400 hover:bg-lavender-500 shadow-none"
              onClick={() => router.push(`/story/create/therapist?observation_id=${observation.id}`)}
            >
              🔗 이 관찰로 Track A 스토리 만들기
            </Button>
          )}

          {confirmingDelete && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
              <p className="text-sm font-medium text-charcoal">정말 이 관찰 기록을 삭제할까요?</p>
              <p className="text-xs text-soft-gray">삭제하면 되돌릴 수 없어요.</p>
              <div className="flex gap-3">
                <Button variant="danger" size="sm" fullWidth loading={deleting} onClick={handleDelete}>삭제</Button>
                <Button variant="ghost" size="sm" fullWidth disabled={deleting} onClick={() => setConfirmingDelete(false)}>취소</Button>
              </div>
            </div>
          )}
        </Card>
      ) : editing ? (
        <Card className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-charcoal">관찰 일시</p>
            <input
              type="datetime-local"
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
              className="w-full bg-white border-[1.5px] border-gray-200 rounded-xl px-4 py-3 text-charcoal focus:outline-none focus:border-mint-300 transition-colors"
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
                    className={clsx(
                      'flex flex-col items-center gap-1 p-3 rounded-xl border-[1.5px] transition-all',
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

          <Textarea label="A · 선행자극 (Antecedent)" value={antecedent} onChange={(e) => setAntecedent(e.target.value)} className="min-h-[88px]" />
          <Textarea label="B · 관찰된 행동 (Behavior)" value={behavior} onChange={(e) => setBehavior(e.target.value)} className="min-h-[88px]" />
          <Textarea label="C · 결과 (Consequence)" value={consequence} onChange={(e) => setConsequence(e.target.value)} className="min-h-[88px]" />

          {isTherapist && (
            <Textarea
              label="대체행동 목표 (선택) · 치료사 전용"
              value={replacementBehavior}
              onChange={(e) => setReplacementBehavior(e.target.value)}
              className="min-h-[64px]"
            />
          )}

          {isTherapist && (
            <SeatSelector value={seatFunction} onChange={setSeatFunction} />
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="primary" fullWidth loading={saving} disabled={!isValid || saving} onClick={handleSaveEdit}>
              저장하기
            </Button>
            <Button variant="ghost" fullWidth disabled={saving} onClick={() => setEditing(false)}>
              취소
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-5">
          <div className="space-y-1">
            <p className="text-sm font-medium text-charcoal">치료 소견 추가·수정</p>
            <p className="text-xs text-soft-gray">
              아래 ABC 기록은 다른 분이 작성한 내용이라 직접 수정할 수 없어요. SEAT 분류·대체행동 목표만 추가하거나 바꿀 수 있어요.
            </p>
          </div>

          <ABCBlock badge="A" badgeClass="bg-lavender-100 text-lavender-700" title="선행자극 (Antecedent)" value={observation.antecedent} />
          <ABCBlock badge="B" badgeClass="bg-coral-100 text-coral-600" title="관찰된 행동 (Behavior)" value={observation.behavior} />
          <ABCBlock badge="C" badgeClass="bg-mint-100 text-mint-700" title="결과 (Consequence)" value={observation.consequence} />

          <Button variant="ghost" fullWidth loading={analyzing} disabled={analyzing || saving} onClick={handleAnalyze}>
            🤖 AI에게 SEAT 분류·대체행동 제안 받기
          </Button>

          <div className="space-y-1.5">
            <Textarea
              label="대체행동 목표 (선택)"
              hint="이 상황에서 대신 가르치고 싶은 행동은 무엇인가요?"
              value={replacementBehavior}
              onChange={(e) => setReplacementBehavior(e.target.value)}
              className="min-h-[64px]"
            />
            {aiResult?.replacement_behavior_suggestion && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <p className="text-xs text-amber-800">
                  <span className="font-medium">🤖 AI 제안:</span> {aiResult.replacement_behavior_suggestion}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-amber-600">초안 제안이에요. 아이의 맥락에 맞게 검토·수정해 주세요</p>
                  <button
                    type="button"
                    onClick={() => setReplacementBehavior(aiResult.replacement_behavior_suggestion ?? '')}
                    className="text-xs font-medium text-mint-600 hover:text-mint-700 px-2 py-1 rounded-lg hover:bg-mint-50 transition-colors flex-shrink-0"
                  >
                    이 제안 적용하기
                  </button>
                </div>
              </div>
            )}
          </div>
          <SeatSelector value={seatFunction} onChange={setSeatFunction} aiResult={aiResult ?? undefined} loading={analyzing} />

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="primary" fullWidth loading={saving} disabled={saving} onClick={handleSaveAnalysis}>
              저장하기
            </Button>
            <Button variant="ghost" fullWidth disabled={saving} onClick={() => setAddingAnalysis(false)}>
              취소
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
