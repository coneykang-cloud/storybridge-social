'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { TrackBadge } from '@/components/story/TrackBadge'
import { SixWHGuide } from '@/components/story/SixWHGuide'
import { ChunkingStrategyPanel } from '@/components/story/ChunkingStrategyPanel'
import { ChildSelectorPanel } from '@/components/story/ChildSelectorPanel'
import { useStoryStore } from '@/stores/story.store'
import { useChildStore } from '@/stores/child.store'
import type { ChunkingType, PresentationMode, Child } from '@/types/app.types'

export default function TrackBPage() {
  const router = useRouter()
  const { children, selectedChild, fetchChildren, selectChild, isLoading } = useChildStore()
  const { generateStory, isGenerating, streamedPages, clarifyingQuestions, resetGeneration } = useStoryStore()

  const [rawInput, setRawInput] = useState('')
  const [chunkingType] = useState<ChunkingType>('mixed')
  const [presentationMode] = useState<PresentationMode>('cumulative')

  useEffect(() => { fetchChildren() }, [])

  const handleGenerate = async () => {
    if (!selectedChild || !rawInput.trim()) return
    await generateStory({
      child_id: selectedChild.id,
      raw_input: rawInput,
      track: 'B',
      chunking_type: chunkingType,
      presentation_mode: presentationMode,
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
        <TrackBadge track="B" size="md" />
      </div>

      <div className="flex gap-5">
        {/* 아이 선택 패널 (여러 명일 때) */}
        {children.length > 1 && (
          <ChildSelectorPanel
            children={children}
            selectedId={selectedChild?.id ?? null}
            onSelect={(child: Child) => selectChild(child)}
          />
        )}

        {/* 스토리 입력 폼 */}
        <div className="flex-1 space-y-5 pb-24">
          {selectedChild && (
            <div>
              <h1 className="text-2xl font-bold text-charcoal">{selectedChild.name}의 이야기 만들기</h1>
              <p className="text-sm text-soft-gray mt-1">우리 아이에게 어떤 이야기가 필요한가요?</p>
            </div>
          )}

          <Textarea
            label="상황을 자유롭게 적어주세요"
            placeholder={`예: ${selectedChild?.name ?? '아이'}이가 점심시간에 급식실에서 줄을 서다 친구가 새치기를 해서 화가 나요.`}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            className="min-h-[160px]"
          />

          <SixWHGuide onExampleSelect={setRawInput} />

          <ChunkingStrategyPanel
            chunkingType={chunkingType}
            presentationMode={presentationMode}
            canEdit={false}
          />

          {clarifyingQuestions.length > 0 && (
            <Card className="border-warning-amber bg-warning-amber/5">
              <p className="text-sm font-semibold text-charcoal mb-2">조금 더 알려주시면 더 좋은 이야기가 돼요 💬</p>
              {clarifyingQuestions.map((q, i) => <p key={i} className="text-sm text-charcoal mb-1">• {q}</p>)}
              <Button variant="ghost" size="sm" className="mt-2" onClick={resetGeneration}>다시 입력</Button>
            </Card>
          )}

          {isGenerating && (
            <Card className="text-center py-6">
              <div className="animate-pulse text-4xl mb-3">✨</div>
              <p className="font-semibold text-charcoal">소셜 스토리를 만들고 있어요...</p>
              <p className="text-sm text-soft-gray mt-1">{streamedPages.length > 0 ? `${streamedPages.length}페이지 생성됨` : 'AI가 이야기를 구성 중'}</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3 mx-auto max-w-xs">
                <div className="bg-mint-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((streamedPages.length / 10) * 100, 100)}%` }} />
              </div>
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
