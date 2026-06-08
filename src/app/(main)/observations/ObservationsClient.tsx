'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ChildSelectorPanel } from '@/components/story/ChildSelectorPanel'
import { ObservationHistory } from '@/components/story/ObservationHistory'
import { useChildStore } from '@/stores/child.store'
import type { BehaviorObservation, Child } from '@/types/app.types'

export function ObservationsClient() {
  const router = useRouter()
  const { children, selectedChild, fetchChildren, selectChild, isLoading: childrenLoading } = useChildStore()
  useEffect(() => { fetchChildren() }, [])

  const [observations, setObservations] = useState<BehaviorObservation[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedChild) return
    setLoading(true)
    fetch(`/api/observations?child_id=${selectedChild.id}`)
      .then((res) => res.json())
      .then((body) => setObservations(body.observations ?? []))
      .finally(() => setLoading(false))
  }, [selectedChild?.id])

  if (childrenLoading) {
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
    <div className="flex gap-5">
      {children.length > 1 && (
        <ChildSelectorPanel
          children={children}
          selectedId={selectedChild?.id ?? null}
          onSelect={(child: Child) => selectChild(child)}
        />
      )}

      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-charcoal">{selectedChild?.name}의 관찰 기록</h2>
          <Button variant="primary" size="sm" className="gap-1" onClick={() => router.push('/observations/new')}>
            <Plus size={16} /> 새 기록 작성
          </Button>
        </div>

        <ObservationHistory
          observations={observations}
          loading={loading}
          onSelect={(obs) => router.push(`/observations/${obs.id}`)}
        />
      </div>
    </div>
  )
}
