'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { TrackBadge } from '@/components/story/TrackBadge'
import { TherapyGoalTags } from '@/components/story/TherapyGoalTags'
import { ChunkingStrategyPanel } from '@/components/story/ChunkingStrategyPanel'
import { ChildSelectorPanel } from '@/components/story/ChildSelectorPanel'
import { useStoryStore } from '@/stores/story.store'
import { useChildStore } from '@/stores/child.store'
import type { ChunkingType, PresentationMode, Child } from '@/types/app.types'

const SIX_WH_GUIDE = [
  { icon: '👤', label: '누가', desc: '치료 대상 아동 + 등장인물' },
  { icon: '⏰', label: '언제', desc: '치료 세션 / 일상 어느 시점?' },
  { icon: '📍', label: '어디서', desc: '클리닉 / 학교 / 가정 중 어디?' },
  { icon: '💬', label: '무엇을', desc: '어떤 행동·상황이 목표인가요?' },
  { icon: '✋', label: '어떻게', desc: '어떤 대처 행동을 목표로 하나요?' },
  { icon: '❤️', label: '왜', desc: '이 행동이 왜 중요한가요?' },
]

export default function TrackAPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { children, selectedChild, fetchChildren, selectChild, isLoading } = useChildStore()
  useEffect(() => { fetchChildren() }, [])
  const { generateStory, isGenerating, streamedPages, clarifyingQuestions, resetGeneration } = useStoryStore()

  const [rawInput, setRawInput] = useState('')
  const [therapyGoalTags, setTherapyGoalTags] = useState<string[]>([])
  const [chunkingType, setChunkingType] = useState<ChunkingType>('mixed')
  const [presentationMode, setPresentationMode] = useState<PresentationMode>('cumulative')
  const [isGuideOpen, setIsGuideOpen] = useState(true)
  const [observationId, setObservationId] = useState<string | null>(null)

  // 관찰 기록에서 연결되어 들어온 경우, ABC 데이터를 입력값으로 자동 주입
  useEffect(() => {
    const obsId = searchParams.get('observation_id')
    if (!obsId || children.length === 0) return

    fetch(`/api/observations/${obsId}/story-input`)
      .then((res) => res.json())
      .then(({ story_input }) => {
        if (!story_input) return
        setObservationId(obsId)
        setRawInput(story_input.raw_input ?? '')
        setTherapyGoalTags(story_input.therapy_goal_tags ?? [])
        if (story_input.chunking_type) setChunkingType(story_input.chunking_type)
        if (story_input.presentation_mode) setPresentationMode(story_input.presentation_mode)
        const matchedChild = children.find((c) => c.id === story_input.child_id)
        if (matchedChild) selectChild(matchedChild)
      })
      .catch(() => {})
  }, [searchParams, children])

  const handleGenerate = async () => {
    if (!selectedChild || !rawInput.trim()) return
    await generateStory({
      child_id: selectedChild.id,
      raw_input: rawInput,
      track: 'A',
      chunking_type: chunkingType,
      presentation_mode: presentationMode,
      therapy_goal_tags: therapyGoalTags,
      ...(observationId ? { observation_id: observationId } : {}),
    })
    if (clarifyingQuestions.length === 0) {
      setTimeout(() => router.push('/dashboard'), 1000)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><div className="animate-pulse text-mint-400 text-4xl">✨</div></div>
  }

  if (!selectedChild && children.length === 0) {
    return (
      <div className="px-5 py-6 text-center">
        <p className="text-4xl mb-3">🧒</p>
        <p className="font-medium text-charcoal mb-1">등록된 아이 프로필이 없어요</p>
        <p className="text-sm text-soft-gray mb-5">아이 프로필을 먼저 등록해야 스토리를 만들 수 있어요</p>
        <Button variant="cta" onClick={() => router.push('/profile')}>아이 프로필로 이동</Button>
      </div>
    )
  }

  return (
    <div className="px-5 py-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="text-sm text-soft-gray">← 뒤로</button>
        <TrackBadge track="A" size="md" />
      </div>

      <div className="flex gap-5">
        {children.length > 1 && (
          <ChildSelectorPanel
            children={children}
            selectedId={selectedChild?.id ?? null}
            onSelect={(child: Child) => selectChild(child)}
          />
        )}
        <div className="flex-1 space-y-5 pb-24">

      <div>
        <h1 className="text-2xl font-bold text-charcoal">{selectedChild.name}의 치료 스토리</h1>
        <p className="text-sm text-soft-gray mt-1">치료 목표 기반 소셜스토리를 만들어요</p>
      </div>

      {observationId && (
        <Card className="bg-lavender-100/50 border-lavender-200 py-3">
          <p className="text-sm text-lavender-700">
            🔗 행동 관찰 기록의 ABC 데이터를 가져왔어요. 내용을 검토하고 필요하면 수정해 주세요.
          </p>
        </Card>
      )}

      <Textarea
        label="아동의 현재 도전 상황을 적어주세요"
        placeholder="예: 민준이가 치료실에서 차례 기다리기를 어려워해요. 친구가 먼저 장난감을 가져가면 소리를 지르는 경우가 많아요. 차례를 기다리는 적절한 행동을 알려주고 싶어요."
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        className="min-h-[160px]"
      />

      <TherapyGoalTags selected={therapyGoalTags} onChange={setTherapyGoalTags} />

      {/* 6WH 가이드 */}
      <div className="border border-lavender-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsGuideOpen((v) => !v)}
          className="w-full flex items-center justify-between p-3 bg-lavender-100 text-left"
        >
          <span className="text-sm font-medium text-charcoal">📋 치료사 전용 6WH 가이드</span>
          <span className="text-soft-gray text-xs">{isGuideOpen ? '▲' : '▼'}</span>
        </button>
        {isGuideOpen && (
          <div className="p-3 space-y-2 bg-lavender-100/40">
            {SIX_WH_GUIDE.map(({ icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2 text-sm">
                <span>{icon}</span>
                <span className="font-medium text-charcoal w-10 shrink-0">{label}</span>
                <span className="text-soft-gray">{desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ChunkingStrategyPanel
        chunkingType={chunkingType}
        presentationMode={presentationMode}
        canEdit={true}
        onChange={(type, mode) => { setChunkingType(type); setPresentationMode(mode) }}
      />

      {clarifyingQuestions.length > 0 && (
        <Card className="border-warning-amber bg-warning-amber/5">
          <p className="text-sm font-semibold text-charcoal mb-2">조금 더 알려주시면 더 좋은 스토리가 돼요 💬</p>
          {clarifyingQuestions.map((q, i) => <p key={i} className="text-sm text-charcoal mb-1">• {q}</p>)}
          <Button variant="ghost" size="sm" className="mt-2" onClick={resetGeneration}>다시 입력</Button>
        </Card>
      )}

      {isGenerating && (
        <Card className="text-center py-6">
          <div className="animate-pulse text-4xl mb-3">✨</div>
          <p className="font-semibold text-charcoal">치료 목표 기반 스토리를 만들고 있어요...</p>
          <p className="text-sm text-soft-gray mt-1">{streamedPages.length > 0 ? `${streamedPages.length}페이지 생성됨` : 'AI가 구성 중'}</p>
        </Card>
      )}

          <Button variant="cta" size="lg" fullWidth onClick={handleGenerate} loading={isGenerating} disabled={!rawInput.trim() || !selectedChild}>
            스토리 만들기 ✨
          </Button>
        </div>
      </div>
    </div>
  )
}
