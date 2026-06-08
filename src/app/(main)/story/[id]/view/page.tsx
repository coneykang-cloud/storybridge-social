import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { StoryViewer } from '@/components/story/StoryViewer'
import type { Story, StoryPage } from '@/types/app.types'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }>
}

export default async function StoryViewPage({ params, searchParams }: Props) {
  const { id } = await params
  const { mode: rawMode } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [storyRes, pagesRes] = await Promise.all([
    supabase.from('stories').select('*, children(name, age_group)').eq('id', id).single(),
    supabase.from('story_pages').select('*').eq('story_id', id).order('page_number'),
  ])

  if (!storyRes.data) notFound()

  const story = storyRes.data as Story & { children: { name: string } | null }
  const pages = (pagesRes.data ?? []) as StoryPage[]
  const mode = (rawMode as 'manual' | 'autoplay' | 'slideshow') ?? 'manual'

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* 상단 얇은 바 */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
        <Link href={`/story/${id}`} className="text-sm text-soft-gray flex items-center gap-1 hover:text-charcoal">
          ← 뒤로
        </Link>
        <div className="flex gap-2">
          {(['manual', 'autoplay', 'slideshow'] as const).map((m) => (
            <Link
              key={m}
              href={`?mode=${m}`}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                mode === m ? 'bg-mint-300 text-charcoal' : 'bg-gray-100 text-soft-gray hover:bg-gray-200'
              }`}
            >
              {m === 'manual' ? '수동' : m === 'autoplay' ? '자동' : '슬라이드'}
            </Link>
          ))}
        </div>
      </header>

      {/* 뷰어 */}
      <div className="flex-1 overflow-hidden">
        <StoryViewer
          title={story.title}
          childName={story.children?.name}
          pages={pages}
          mode={mode}
          presentationMode={story.presentation_mode}
          track={story.track}
          homeConnectionMemo={story.home_connection_memo ?? undefined}
        />
      </div>
    </div>
  )
}
