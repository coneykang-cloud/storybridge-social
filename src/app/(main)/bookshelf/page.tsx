export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookshelfClient } from './BookshelfClient'
import type { Story } from '@/types/app.types'

export default async function BookshelfPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data: profileData }, { data }] = await Promise.all([
    supabase.from('user_profiles').select('role').eq('id', user.id).single(),
    // RLS가 본인 등록 아이 또는 그룹으로 연결된 아이의 스토리로 조회 범위를 제한함
    supabase
      .from('stories')
      .select('*, children(name, age_group), story_pages(image_url, page_number)')
      .order('updated_at', { ascending: false }),
  ])

  const userRole = (profileData?.role ?? null) as import('@/types/app.types').UserRole | null

  const stories = (data ?? []) as (Story & {
    children: { name: string; age_group: string } | null
    story_pages: { image_url: string | null; page_number: number }[]
  })[]

  return (
    <div className="px-5 py-6 max-w-4xl mx-auto space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">브릿지 책장</h1>
        <p className="text-sm text-soft-gray mt-0.5">
          {userRole === 'child' ? '나를 위해 만들어진 이야기를 읽어보세요' : '지금까지 만든 모든 이야기를 한곳에서 모아봐요'}
        </p>
      </div>

      <BookshelfClient stories={stories} userRole={userRole} />
    </div>
  )
}
