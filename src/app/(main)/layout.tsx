import { createClient } from '@/lib/supabase/server'
import { SideBar } from '@/components/layout/SideBar'
import { BottomNavBar } from '@/components/layout/BottomNavBar'
import type { UserRole } from '@/types/app.types'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: UserRole | null = null
  let unreadCount = 0
  if (user) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('user_profiles').select('role').eq('id', user.id).single(),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false),
    ])
    role = (profile?.role ?? null) as UserRole | null
    unreadCount = count ?? 0
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar role={role} unreadCount={unreadCount} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
      <BottomNavBar role={role} />
    </div>
  )
}
