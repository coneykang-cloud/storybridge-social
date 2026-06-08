'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { TrackBadge } from '@/components/story/TrackBadge'
import { SchoolContextTags } from '@/components/story/SchoolContextTags'
import { ChunkingStrategyPanel } from '@/components/story/ChunkingStrategyPanel'
import { ChildSelectorPanel } from '@/components/story/ChildSelectorPanel'
import { useStoryStore } from '@/stores/story.store'
import { useChildStore, type ChildWithAvatars } from '@/stores/child.store'
import type { ChunkingType, PresentationMode } from '@/types/app.types'

const SIX_WH_GUIDE = [
  { icon: '👤', label: '누가', desc: '아동 + 학급 친구들 / 선생님' },
  { icon: '⏰', label: '언제', desc: '어느 수업·시간대인가요?' },
  { icon: '📍', label: '어디서', desc: '교실 / 복도 / 급식실 / 운동장' },
  { icon: '💬', label: '무엇을', desc: '어떤 상황이 어렵나요?' },
  { icon: '✋', label: '어떻게', desc: '학교에서 어떻게 행동하면 좋을까요?' },
  { icon: '❤️', label: '왜', desc: '왜 그 행동이 학급에 도움이 되나요?' },
]

export default function TrackCPage() {
  const router = useRouter()
  const { children, selectedChild, fetchChildren, selectChild, isLoading } = useChildStore()
  useEffect(() => { fetchChildren() }, [])
  const { generateStory, isGenerating, streamedPages, clarifyingQuestions, resetGeneration } = useStoryStore()

  const [rawInput, setRawInput] = useState('')
  const [schoolContextTags, setSchoolContextTags] = useState<string[]>([])
  const [homeConnectionMemo, setHomeConnectionMemo] = useState('')
  const [chunkingType] = useState<ChunkingType>('mixed')
  const [presentationMode] = useState<PresentationMode>('cumulative')
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const handleGenerate = async () => {
    if (!selectedChild || !rawInput.trim()) return
    await generateStory({
      child_id: selectedChild.id,
      raw_input: rawInput,
      track: 'C',
      chunking_type: chunkingType,
      presentation_mode: presentationMode,
      school_context_tags: schoolContextTags,
      home_connection_memo: homeConnectionMemo || undefined,
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
        <TrackBadge track="C" size="md" />
      </div>

      <div className="flex gap-5">
        {children.length > 1 && (
          <ChildSelectorPanel
            children={children}
            selectedId={selectedChild?.id ?? null}
            onSelect={(child: ChildWithAvatars) => selectChild(child)}
          />
        )}
        <div className="flex-1 space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">{selectedChild?.name}의 학교 이야기</h1>
        <p className="text-sm text-soft-gray mt-1">학교 상황 소셜스토리를 만들어요</p>
      </div>

      <Textarea
        label="교실에서 어떤 상황이 필요한지 적어주세요"
        placeholder="예: 민준이가 모둠 활동 시간에 친구들과 함께 과제를 해야 하는데, 자기 의견만 주장하고 친구 의견을 무시하는 경우가 많아요. 서로 의견을 나누는 방법을 알려주고 싶어요."
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        className="min-h-[140px]"
      />

      <SchoolContextTags selected={schoolContextTags} onChange={setSchoolContextTags} />

      {/* 교사 6WH 가이드 */}
      <div className="border border-orange-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsGuideOpen((v) => !v)}
          className="w-full flex items-center justify-between p-3 bg-orange-50 text-left"
        >
          <span className="text-sm font-medium text-charcoal">📋 교사 전용 6WH 가이드</span>
          <span className="text-soft-gray text-xs">{isGuideOpen ? '▲' : '▼'}</span>
        </button>
        {isGuideOpen && (
          <div className="p-3 space-y-2 bg-orange-50/50">
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

      {/* 가정 연계 메모 */}
      <Textarea
        label="🏠 가정 연계 메모 (선택)"
        placeholder="집에서도 이렇게 연습해주세요... (보호자·치료사에게 전달됩니다)"
        value={homeConnectionMemo}
        onChange={(e) => setHomeConnectionMemo(e.target.value)}
        className="min-h-[80px]"
      />

      <ChunkingStrategyPanel
        chunkingType={chunkingType}
        presentationMode={presentationMode}
        canEdit={false}
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
          <p className="font-semibold text-charcoal">학교 소셜 스토리를 만들고 있어요...</p>
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
