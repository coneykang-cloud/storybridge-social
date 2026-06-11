export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Bell, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Story, UserProfile } from '@/types/app.types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  // 내 아이들 ID 먼저 조회 → 해당 아이들의 스토리만 가져오기 (RLS 우회)
  const { data: myChildren } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', user.id)

  const childIds = (myChildren ?? []).map((c: { id: string }) => c.id)

  const [profileRes, storiesRes, pendingRes, unreadRes] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    childIds.length > 0
      ? supabase.from('stories')
          .select('*, children(name), story_pages(image_url, page_number)')
          .in('child_id', childIds)
          .order('updated_at', { ascending: false })
          .limit(6)
      : supabase.from('stories')
          .select('*, children(name), story_pages(image_url, page_number)')
          .eq('creator_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(6),
    supabase.from('approvals').select('id').eq('status', 'pending'),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
  ])

  const profile = profileRes.data as UserProfile | null
  const stories = (storiesRes.data ?? []) as Story[]
  const pendingCount = pendingRes.data?.length ?? 0
  const unreadCount = unreadRes.count ?? 0

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto space-y-6">
      {/* 헤더 인사 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal mb-1">
            안녕하세요, {profile?.full_name ?? ''}님! 👋
          </h1>
          <p className="text-sm text-soft-gray">오늘도 함께 이야기를 만들어요</p>
        </div>
        {pendingCount > 0 && (
          <Link href="/collab" className="relative p-2">
            <Bell size={24} className="text-charcoal" />
            <Badge variant="count" className="absolute -top-1 -right-1">
              {pendingCount}
            </Badge>
          </Link>
        )}
      </div>

      {/* 승인 대기 배너 (보호자 전용) */}
      {profile?.role === 'parent' && pendingCount > 0 && (
        <Link href="/collab">
          <Card className="border-coral-300 bg-coral-500/5 hover:bg-coral-500/10 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔴</span>
              <div>
                <p className="font-semibold text-charcoal text-sm">승인 대기 {pendingCount}건</p>
                <p className="text-xs text-soft-gray break-keep">전문가의 수정 제안이 있어요</p>
              </div>
              <span className="ml-auto text-coral-500 text-sm font-medium">확인하기 →</span>
            </div>
          </Card>
        </Link>
      )}

      {/* 안 읽은 알림 배너 (전체 역할) */}
      {unreadCount > 0 && (
        <Link href="/notifications">
          <Card className="border-mint-300 bg-mint-50 hover:bg-mint-100/60 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔔</span>
              <div>
                <p className="font-semibold text-charcoal text-sm">안 읽은 알림 {unreadCount}건</p>
                <p className="text-xs text-soft-gray break-keep">수정 제안·처리 결과를 확인해 보세요</p>
              </div>
              <span className="ml-auto text-mint-700 text-sm font-medium">확인하기 →</span>
            </div>
          </Card>
        </Link>
      )}

      {/* 최근 스토리 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-charcoal">최근 스토리</h2>
          <Link href="/bookshelf" className="text-sm text-mint-600 font-medium">전체 보기</Link>
        </div>

        {stories.length === 0 ? (
          <Card className="text-center py-10">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-charcoal font-medium">아직 스토리가 없어요</p>
            <p className="text-sm text-soft-gray mt-1 mb-4">첫 번째 이야기를 만들어 보세요!</p>
            <Link href="/story/create">
              <Button variant="cta" size="md">스토리 만들기 ✨</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stories.map((story) => {
              const pages = (story as Story & { story_pages?: { image_url: string | null; page_number: number }[] }).story_pages
              const coverImage = pages
                ?.sort((a, b) => a.page_number - b.page_number)
                .find((p) => p.image_url)?.image_url ?? null
              return (
                <Link key={story.id} href={`/story/${story.id}`}>
                  <Card hover padding="none" className="overflow-hidden">
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
                    <div className="p-3">
                      <p className="font-medium text-sm text-charcoal line-clamp-1">{story.title}</p>
                      <p className="text-xs text-soft-gray mt-0.5">
                        {story.page_count}페이지
                      </p>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 새 스토리 CTA (고정 버튼) */}
      <div className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-40">
        <Link href="/story/create">
          <Button variant="cta" size="lg" className="rounded-full shadow-coral gap-2">
            <Plus size={20} />
            <span className="hidden sm:inline">새 스토리</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}

