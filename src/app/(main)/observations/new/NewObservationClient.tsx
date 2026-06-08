'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ChildSelectorPanel } from '@/components/story/ChildSelectorPanel'
import { ObservationForm } from '@/components/story/ObservationForm'
import { useChildStore } from '@/stores/child.store'
import type { BehaviorObservation, Child, UserRole } from '@/types/app.types'

interface NewObservationClientProps {
  role: UserRole
}

export function NewObservationClient({ role }: NewObservationClientProps) {
  const router = useRouter()
  const { children, selectedChild, fetchChildren, selectChild, isLoading } = useChildStore()
  useEffect(() => { fetchChildren() }, [])

  const isTherapist = role === 'therapist'
  const [linking, setLinking] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [savedObservation, setSavedObservation] = useState<BehaviorObservation | null>(null)

  function handleSaved(observation: BehaviorObservation) {
    setSavedObservation(observation)
    // 치료사는 저장 직후 AI 분석·SEAT 분류·스토리 연결 작업을 이어가므로 자동 이동하지 않음
    if (!isTherapist) {
      setRedirecting(true)
      router.push('/observations')
    }
  }

  async function handleLinkStory(observationId: string) {
    setLinking(true)
    try {
      router.push(`/story/create/therapist?observation_id=${observationId}`)
    } finally {
      setLinking(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><div className="animate-pulse text-mint-400 text-4xl">✨</div></div>
  }

  if (children.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-4xl mb-3">🧒</p>
        <p className="font-medium text-charcoal mb-1">등록된 아이 프로필이 없어요</p>
        <p className="text-sm text-soft-gray mb-5">아이 프로필을 먼저 등록해야 행동 관찰을 기록할 수 있어요</p>
        <Button variant="cta" onClick={() => router.push('/profile')}>아이 프로필로 이동</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-soft-gray">← 뒤로</button>
        <h1 className="text-xl font-bold text-charcoal">새 행동 관찰 기록</h1>
      </div>

      <div className="flex gap-5">
        {children.length > 1 && (
          <ChildSelectorPanel
            children={children}
            selectedId={selectedChild?.id ?? null}
            onSelect={(child: Child) => selectChild(child)}
          />
        )}

        {selectedChild && (
          <div className="flex-1 space-y-4">
            <ObservationForm
              childId={selectedChild.id}
              role={role}
              onSaved={handleSaved}
              onLinkStory={handleLinkStory}
            />

            {isTherapist && savedObservation && (
              <Button variant="secondary" fullWidth onClick={() => router.push('/observations')}>
                관찰 기록 목록으로 이동
              </Button>
            )}
          </div>
        )}
      </div>

      {redirecting && <p className="text-sm text-soft-gray text-center">관찰 기록 목록으로 이동 중...</p>}
      {linking && <p className="text-sm text-soft-gray text-center">Track A 스토리 만들기로 이동 중...</p>}
    </div>
  )
}
