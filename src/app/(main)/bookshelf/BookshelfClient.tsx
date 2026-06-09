'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TrackBadge } from '@/components/story/TrackBadge'
import type { Story, Track, UserRole } from '@/types/app.types'

type StoryWithExtras = Story & {
  children: { name: string; age_group: string } | null
  story_pages: { image_url: string | null; page_number: number }[]
}

const TRACK_FILTERS: { value: Track | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'A',   label: '🩺 치료사' },
  { value: 'B',   label: '👩 보호자' },
  { value: 'C',   label: '👩‍🏫 교사' },
]

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function ChildConnectForm() {
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const join = async () => {
    if (!code.trim()) return
    setIsLoading(true)
    const res = await fetch('/api/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg('연결됐어요! 이제 내 이야기를 볼 수 있어요 🎉')
      window.location.reload()
    } else {
      setMsg(data.error ?? '연결에 실패했어요. 코드를 다시 확인해 주세요.')
    }
    setIsLoading(false)
  }

  return (
    <div className="p-4 bg-mint-50 rounded-2xl border border-mint-200">
      <p className="text-sm font-semibold text-charcoal mb-1">초대 코드로 연결하기</p>
      <p className="text-xs text-soft-gray mb-3">보호자·선생님·치료사에게 초대 코드를 받아 입력해 주세요</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="초대 코드 6자리"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-mint-300"
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
        <button
          onClick={join}
          disabled={isLoading || !code.trim()}
          className="px-4 py-2 bg-mint-300 text-charcoal rounded-xl text-sm font-medium hover:bg-mint-400 disabled:opacity-50"
        >
          {isLoading ? '...' : '연결'}
        </button>
      </div>
      {msg && <p className="text-xs mt-2 text-charcoal">{msg}</p>}
    </div>
  )
}

interface Props {
  stories: StoryWithExtras[]
  userRole?: UserRole | null
}

export function BookshelfClient({ stories, userRole }: Props) {
  const isChild = userRole === 'child'
  const [trackFilter, setTrackFilter] = useState<Track | 'all'>('all')

  const filtered = useMemo(
    () => trackFilter === 'all' ? stories : stories.filter((s) => s.track === trackFilter),
    [stories, trackFilter]
  )

  if (stories.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="text-center py-10">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-charcoal font-medium">아직 책장에 담긴 이야기가 없어요</p>
          {isChild ? (
            <p className="text-sm text-soft-gray mt-1">초대 코드를 입력하면 내 이야기가 여기에 나타나요</p>
          ) : (
            <>
              <p className="text-sm text-soft-gray mt-1 mb-4">첫 번째 이야기를 만들어 보세요!</p>
              <Link href="/story/create">
                <Button variant="cta" size="md">스토리 만들기 ✨</Button>
              </Link>
            </>
          )}
        </Card>
        {isChild && <ChildConnectForm />}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isChild && <ChildConnectForm />}
      <div className="flex gap-2 flex-wrap">
        {TRACK_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTrackFilter(value)}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
              trackFilter === value
                ? 'bg-mint-300 text-charcoal'
                : 'bg-white border border-gray-200 text-soft-gray hover:border-mint-300'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-charcoal font-medium">해당 트랙의 이야기가 없어요</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((story) => {
            const coverImage = story.story_pages
              ?.slice()
              .sort((a, b) => a.page_number - b.page_number)
              .find((p) => p.image_url)?.image_url ?? null

            return (
              <Link key={story.id} href={`/story/${story.id}`}>
                <Card hover padding="none" className="overflow-hidden h-full flex flex-col">
                  <div className="relative aspect-video bg-mint-100">
                    {coverImage ? (
                      <Image
                        src={coverImage}
                        alt={story.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 300px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-3xl">📖</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col gap-1.5">
                    <p className="font-medium text-sm text-charcoal line-clamp-2">{story.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <TrackBadge track={story.track} size="sm" />
                      {story.children?.name && (
                        <span className="text-xs text-soft-gray">{story.children.name}</span>
                      )}
                    </div>
                    <p className="text-xs text-soft-gray mt-auto pt-1">
                      {story.page_count}페이지 · {formatDate(story.updated_at)}
                    </p>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
