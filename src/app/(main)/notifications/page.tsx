export const dynamic = 'force-dynamic'
export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsClient } from './NotificationsClient'
import type { Notification } from '@/types/app.types'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="px-5 py-6 max-w-xl mx-auto space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">알림</h1>
        <p className="text-sm text-soft-gray mt-0.5">수정 제안과 처리 결과를 모아봐요</p>
      </div>

      <NotificationsClient userId={user.id} initialNotifications={(data ?? []) as Notification[]} />
    </div>
  )
}
