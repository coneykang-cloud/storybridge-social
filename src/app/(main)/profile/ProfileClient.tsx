'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Copy, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AvatarStudioClient } from '@/app/(main)/avatar-studio/AvatarStudioClient'
import { clsx } from 'clsx'
import type { Child, Avatar } from '@/types/app.types'

type ChildWithAvatars = Child & { avatars: Avatar[]; groups: { invite_code: string }[] }

function InviteCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className="pt-3 border-t border-gray-100">
      <p className="text-xs text-soft-gray font-medium mb-1.5">초대 코드</p>
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-mint-600 bg-mint-50 px-3 py-1.5 rounded-lg text-sm tracking-wide">
          {code}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs font-medium text-soft-gray hover:text-mint-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check size={14} className="text-mint-600" /> : <Copy size={14} />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <p className="text-[11px] text-soft-gray mt-1">치료사·교사에게 이 코드를 공유하면 협업 공간에서 함께 기록을 관리할 수 있어요</p>
    </div>
  )
}

const AGE_GROUP_LABEL: Record<string, string> = {
  '5-6':   '미취학',
  '7-9':   '초(저학년)',
  '10-12': '초(고학년)',
  '13-15': '중학생',
  '16-18': '고등학생',
}

interface Props {
  children: ChildWithAvatars[]
  userId: string
}

export function ProfileClient({ children, userId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    children[0]?.id ?? null
  )
  const [childList, setChildList] = useState(children)

  const selected = childList.find((c) => c.id === selectedId) ?? null
  const isOwner = selected?.parent_id === userId
  const age = selected ? new Date().getFullYear() - selected.birth_year : 0
  const profileAvatar = selected?.avatars?.find((a) => a.is_default) ?? selected?.avatars?.[0]

  const handleAvatarSelected = (childId: string, avatarId: string) => {
    setChildList((prev) =>
      prev.map((c) =>
        c.id === childId
          ? { ...c, avatars: c.avatars.map((a) => ({ ...a, is_default: a.id === avatarId })) }
          : c
      )
    )
  }

  const handleAvatarGenerated = (childId: string, avatar: Avatar) => {
    setChildList((prev) =>
      prev.map((c) =>
        c.id === childId ? { ...c, avatars: [...c.avatars, avatar] } : c
      )
    )
  }

  const handleAvatarDeleted = (childId: string, avatarId: string) => {
    setChildList((prev) =>
      prev.map((c) =>
        c.id === childId
          ? { ...c, avatars: c.avatars.filter((a) => a.id !== avatarId) }
          : c
      )
    )
  }

  if (childList.length === 0) {
    return (
      <Card className="text-center py-10">
        <p className="text-4xl mb-3">🧒</p>
        <p className="font-medium text-charcoal">등록되거나 연결된 아이 프로필이 없어요</p>
        <p className="text-sm text-soft-gray mt-1 mb-4">아이 정보를 등록하거나, 보호자에게 받은 초대 코드로 협업 공간에서 연결해보세요</p>
        <div className="flex items-center justify-center gap-2">
          <Link href="/onboarding/child">
            <Button variant="cta" size="md">프로필 등록하기</Button>
          </Link>
          <Link href="/collab">
            <Button variant="secondary" size="md">초대 코드로 연결하기</Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex gap-0 md:gap-5 h-full">

      {/* ── 좌측: 아이 목록 ───────────────────────── */}
      {/* 모바일: 수평 스크롤 */}
      <div className="md:hidden flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 mb-4">
        {childList.map((child) => {
          const avatar = child.avatars?.find((a) => a.is_default) ?? child.avatars?.[0]
          const isSelected = child.id === selectedId
          return (
            <button
              key={child.id}
              onClick={() => setSelectedId(child.id)}
              className={clsx(
                'flex flex-col items-center gap-1.5 flex-shrink-0 p-2 rounded-2xl transition-all',
                isSelected ? 'bg-mint-100 ring-2 ring-mint-400' : 'bg-white border border-gray-100'
              )}
            >
              {avatar ? (
                <Image src={avatar.image_url} alt={child.name} width={56} height={56}
                  className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-mint-100 flex items-center justify-center text-xl">🧒</div>
              )}
              <span className={clsx('text-xs font-medium', isSelected ? 'text-mint-700' : 'text-charcoal')}>
                {child.name}
              </span>
              <span className="text-[10px] text-soft-gray">{AGE_GROUP_LABEL[child.age_group]}</span>
            </button>
          )
        })}
        <Link href="/onboarding/child"
          className="flex flex-col items-center gap-1.5 flex-shrink-0 p-2 rounded-2xl bg-white border border-dashed border-mint-300 min-w-[72px]">
          <div className="w-14 h-14 rounded-xl bg-mint-50 flex items-center justify-center">
            <Plus size={24} className="text-mint-400" />
          </div>
          <span className="text-xs text-mint-600 font-medium">추가</span>
        </Link>
      </div>

      {/* PC: 좌측 세로 패널 */}
      <div className="hidden md:flex flex-col w-52 flex-shrink-0 gap-2">
        {childList.map((child) => {
          const avatar = child.avatars?.find((a) => a.is_default) ?? child.avatars?.[0]
          const isSelected = child.id === selectedId
          return (
            <button
              key={child.id}
              onClick={() => setSelectedId(child.id)}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-2xl text-left transition-all w-full',
                isSelected
                  ? 'bg-mint-100 ring-2 ring-mint-400'
                  : 'bg-white border border-gray-100 hover:border-mint-200'
              )}
            >
              {avatar ? (
                <Image src={avatar.image_url} alt={child.name} width={48} height={48}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-mint-100 flex items-center justify-center text-xl flex-shrink-0">🧒</div>
              )}
              <div className="min-w-0">
                <p className={clsx('font-semibold text-sm truncate', isSelected ? 'text-mint-700' : 'text-charcoal')}>
                  {child.name}
                </p>
                <p className="text-xs text-soft-gray">{AGE_GROUP_LABEL[child.age_group]}</p>
              </div>
            </button>
          )
        })}
        <Link href="/onboarding/child"
          className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-mint-300 hover:bg-mint-50 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-mint-50 flex items-center justify-center flex-shrink-0">
            <Plus size={20} className="text-mint-400" />
          </div>
          <span className="text-sm text-mint-600 font-medium">아이 추가</span>
        </Link>
      </div>

      {/* ── 우측: 선택된 아이 상세 ───────────────── */}
      {selected && (
        <div className="flex-1 min-w-0 space-y-5 overflow-y-auto pb-24">
          {/* 프로필 정보 카드 */}
          <Card>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 flex-shrink-0">
                {profileAvatar ? (
                  <Image src={profileAvatar.image_url} alt={selected.name} width={80} height={80}
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-mint-300" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-mint-100 flex flex-col items-center justify-center border-2 border-dashed border-mint-300">
                    <span className="text-2xl">🎨</span>
                    <span className="text-[10px] text-mint-600 font-medium mt-0.5">아바타 없음</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-charcoal">{selected.name}</h2>
                  <span className="text-xs bg-mint-100 text-mint-700 px-2 py-0.5 rounded-lg font-medium">
                    {AGE_GROUP_LABEL[selected.age_group]}
                  </span>
                  {!isOwner && (
                    <span className="text-xs bg-lavender-100 text-lavender-700 px-2 py-0.5 rounded-lg font-medium">
                      🔗 연결된 아이
                    </span>
                  )}
                </div>
                <p className="text-sm text-soft-gray mt-0.5">{age}세</p>
                {profileAvatar && (
                  <p className="text-xs text-mint-600 mt-1">
                    ✅ {profileAvatar.style === 'ghibli' ? '지브리풍' :
                        profileAvatar.style === 'pixar' ? '픽사풍' :
                        profileAvatar.style === 'realistic' ? '사진닮은꼴' : '수채화'} 아바타
                  </p>
                )}
              </div>
              {isOwner && (
                <Link href={`/onboarding/child?edit=${selected.id}`}>
                  <button className="p-2 rounded-xl hover:bg-gray-50 text-soft-gray">
                    <Pencil size={18} />
                  </button>
                </Link>
              )}
            </div>

            {selected.interests.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-soft-gray font-medium mb-1.5">관심사</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.interests.map((item) => (
                    <span key={item} className="text-xs bg-lavender-100 text-charcoal px-2.5 py-1 rounded-lg">{item}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.familiar_envs.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-soft-gray font-medium mb-1.5">친숙한 환경</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.familiar_envs.map((item) => (
                    <span key={item} className="text-xs bg-mint-100 text-charcoal px-2.5 py-1 rounded-lg">{item}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.notes && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-soft-gray font-medium mb-1">메모</p>
                <p className="text-sm text-charcoal">{selected.notes}</p>
              </div>
            )}

            {isOwner && selected.groups?.[0]?.invite_code && (
              <InviteCodeBox code={selected.groups[0].invite_code} />
            )}
          </Card>

          {/* 아바타 만들기 (보호자만 관리 가능) */}
          {isOwner && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal mb-3">아바타 만들기</h2>
            <AvatarStudioClient
              key={selected.id}
              child={selected}
              initialAvatars={selected.avatars ?? []}
              onAvatarSelected={(id) => handleAvatarSelected(selected.id, id)}
              onAvatarGenerated={(avatar) => handleAvatarGenerated(selected.id, avatar)}
              onAvatarDeleted={(id) => handleAvatarDeleted(selected.id, id)}
            />
          </div>
          )}
        </div>
      )}
    </div>
  )
}
