'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TrackBadge } from '@/components/story/TrackBadge'
import type { Story, Track } from '@/types/app.types'

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

interface Props {
  stories: StoryWithExtras[]
}

export function BookshelfClient({ stories }: Props) {
  const [trackFilter, setTrackFilter] = useState<Track | 'all'>('all')

  const filtered = useMemo(
    () => trackFilter === 'all' ? stories : stories.filter((s) => s.track === trackFilter),
    [stories, trackFilter]
  )

  if (stories.length === 0) {
    return (
      <Card className="text-center py-10">
        <p className="text-4xl mb-3">📚</p>
        <p className="text-charcoal font-medium">아직 책장에 담긴 이야기가 없어요</p>
        <p className="text-sm text-soft-gray mt-1 mb-4">첫 번째 이야기를 만들어 보세요!</p>
        <Link href="/story/create">
          <Button variant="cta" size="md">스토리 만들기 ✨</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
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
