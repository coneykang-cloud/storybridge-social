import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Play, Users, Edit2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { RoleBadge } from '@/components/ui/Badge'
import { DeleteStoryButton } from '@/components/story/DeleteStoryButton'
import { EditableStoryTitle } from '@/components/story/EditableStoryTitle'
import { StoryPageEditor } from '@/components/story/StoryPageEditor'
import type { Story, StoryPage, Comment } from '@/types/app.types'

interface Props { params: Promise<{ id: string }> }

const CHUNKING_LABEL = {
  temporal: '시간적 청킹',
  spatial:  '공간적 청킹',
  mixed:    '혼합 청킹',
}

export default async function StoryDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [storyRes, pagesRes, commentsRes, profileRes] = await Promise.all([
    supabase.from('stories')
      .select('*, children(name, age_group, parent_id)')
      .eq('id', id)
      .single(),
    supabase.from('story_pages')
      .select('*')
      .eq('story_id', id)
      .order('page_number'),
    supabase.from('comments')
      .select('*, author:user_profiles(id, full_name, role)')
      .eq('story_id', id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('user_profiles').select('role').eq('id', user.id).single(),
  ])

  if (!storyRes.data) notFound()

  const story = storyRes.data as Story
  const pages = (pagesRes.data ?? []) as StoryPage[]
  const recentComments = (commentsRes.data ?? []) as Comment[]

  const child = (story as unknown as { children: { name: string; age_group: string; parent_id: string } }).children
  const isParent = child?.parent_id === user.id
  const isCreator = story.creator_id === user.id
  const role = profileRes.data?.role as import('@/types/app.types').UserRole | undefined
  const canEditDirectly = isParent || isCreator
  const canPropose = role !== 'child' && !canEditDirectly

  return (
    <div className="px-5 py-6 max-w-xl mx-auto space-y-5 pb-24">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-soft-gray">← 뒤로</Link>
          <EditableStoryTitle storyId={id} title={story.title} editable={isCreator} />
          <p className="text-sm text-soft-gray mt-0.5">
            {child?.name} · {CHUNKING_LABEL[story.chunking_type]} · {story.page_count}페이지
          </p>
        </div>
      </div>

      <div>
        <Link href={`/story/${id}/view`} className="block">
          <Button variant="cta" fullWidth className="gap-2">
            <Play size={18} /> 읽기 시작
          </Button>
        </Link>
      </div>

      {(isParent || isCreator) && (
        <div className="flex items-center gap-1.5 text-xs text-soft-gray">
          <Edit2 size={13} />
          제목 옆 연필 아이콘을 눌러 제목을 수정할 수 있어요
        </div>
      )}

      {(isParent || isCreator) && (
        <div>
          <DeleteStoryButton storyId={id} storyTitle={story.title} />
        </div>
      )}

      <section>
        <h2 className="text-base font-semibold text-charcoal mb-3">
          페이지 미리보기 ({pages.length}페이지)
        </h2>
        {canPropose && !canEditDirectly && (
          <p className="text-xs text-soft-gray mb-2">
            ✏️ 연필 아이콘을 눌러 페이지 내용을 수정 제안할 수 있어요. 보낸 제안은 보호자 승인 후 반영돼요.
          </p>
        )}
        <div className="space-y-2">
          {pages.map((page) => (
            <StoryPageEditor
              key={page.id}
              storyId={id}
              page={page}
              canEditDirectly={canEditDirectly}
              canPropose={canPropose}
            />
          ))}
        </div>
      </section>

      {recentComments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
              <Users size={18} /> 최근 자문
            </h2>
            <Link href={`/collab?story_id=${id}`} className="text-xs text-mint-600 font-medium">
              전체 보기
            </Link>
          </div>
          <div className="space-y-2">
            {recentComments.map((comment) => (
              <Card key={comment.id} padding="sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-charcoal">
                    {comment.author?.full_name}
                  </span>
                  {comment.author?.role && <RoleBadge role={comment.author.role} />}
                </div>
                <p className="text-sm text-charcoal line-clamp-2">{comment.content}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
