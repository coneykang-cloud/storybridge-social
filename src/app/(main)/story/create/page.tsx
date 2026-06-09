import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { TrackBadge } from '@/components/story/TrackBadge'
import type { UserRole } from '@/types/app.types'

const TRACK_PAGES: Partial<Record<UserRole, string>> = {
  therapist: '/story/create/therapist',
  parent:    '/story/create/parent',
  teacher:   '/story/create/teacher',
}

export default async function StoryCreatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as UserRole | undefined

  // 역할이 있으면 해당 Track 페이지로 자동 이동
  if (role && role in TRACK_PAGES) {
    redirect(TRACK_PAGES[role]!)
  }

  // 역할 없을 때 수동 선택
  return (
    <div className="px-5 py-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-charcoal mb-2">스토리 만들기</h1>
      <p className="text-soft-gray text-sm mb-8">어떤 방법으로 만들까요?</p>

      <div className="space-y-4">
        <Link href="/story/create/therapist">
          <Card hover className="border-lavender-200 hover:border-lavender-400">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🩺</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-charcoal">치료 목표 기반 생성</h2>
                  <TrackBadge track="A" />
                </div>
                <p className="text-sm text-soft-gray">치료 목표 태그 + 임상 맥락으로 생성해요</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/story/create/parent">
          <Card hover>
            <div className="flex items-start gap-4">
              <span className="text-3xl">👩</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-charcoal">일상 상황 기반 생성</h2>
                  <TrackBadge track="B" />
                </div>
                <p className="text-sm text-soft-gray">자유롭게 상황을 적으면 AI가 소셜 스토리로 변환해요</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/story/create/teacher">
          <Card hover className="border-orange-100 hover:border-orange-300">
            <div className="flex items-start gap-4">
              <span className="text-3xl">👩‍🏫</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-charcoal">학교 맥락 기반 생성</h2>
                  <TrackBadge track="C" />
                </div>
                <p className="text-sm text-soft-gray">학교 맥락 태그 + 가정 연계 메모로 생성해요</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/story/create/pool">
          <Card hover>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-mint-100">
                <BookOpen size={28} className="text-mint-600" />
              </div>
              <div>
                <h2 className="font-bold text-charcoal">템플릿으로 시작하기</h2>
                <p className="text-sm text-soft-gray mt-1">연령대·상황별 사전 제작 템플릿에서 선택해요</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
