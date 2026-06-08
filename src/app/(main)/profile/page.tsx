import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ProfileClient } from './ProfileClient'
import type { Child, Avatar } from '@/types/app.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // RLS가 "본인 등록 아이 또는 그룹으로 연결된 아이"로 조회 범위를 제한함
  const { data: children } = await supabase
    .from('children')
    .select('*, avatars(*), groups(invite_code)')
    .order('created_at')

  const childList = (children ?? []) as (Child & { avatars: Avatar[]; groups: { invite_code: string }[] })[]

  return (
    <div className="px-5 py-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-charcoal">아이 프로필</h1>
        <Link href="/onboarding/child">
          <Button variant="primary" size="sm" className="gap-1">
            <Plus size={16} /> 아이 추가
          </Button>
        </Link>
      </div>

      <ProfileClient children={childList} userId={user.id} />
    </div>
  )
}
