'use client'

import { useState } from 'react'
import { AvatarStudio } from '@/components/avatar/AvatarStudio'
import type { Avatar, Child } from '@/types/app.types'

interface Props {
  child: Child
  initialAvatars: Avatar[]
  onAvatarSelected?: (id: string) => void
  onAvatarGenerated?: (avatar: Avatar) => void
  onAvatarDeleted?: (id: string) => void
}

export function AvatarStudioClient({
  child,
  initialAvatars,
  onAvatarSelected,
  onAvatarGenerated,
  onAvatarDeleted,
}: Props) {
  const [avatars, setAvatars] = useState(initialAvatars)
  const age = new Date().getFullYear() - child.birth_year

  const handleAvatarSelected = (id: string) => {
    setAvatars((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })))
    onAvatarSelected?.(id)
  }

  const handleAvatarGenerated = (avatar: Avatar) => {
    setAvatars((prev) => [...prev, avatar])
    onAvatarGenerated?.(avatar)
  }

  const handleAvatarDeleted = (id: string) => {
    setAvatars((prev) => prev.filter((a) => a.id !== id))
    onAvatarDeleted?.(id)
  }

  return (
    <AvatarStudio
      childId={child.id}
      childName={child.name}
      childAge={age}
      existingAvatars={avatars}
      onAvatarGenerated={handleAvatarGenerated}
      onAvatarDeleted={handleAvatarDeleted}
      onAvatarSelected={handleAvatarSelected}
    />
  )
}
