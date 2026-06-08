import { createClient } from '@/lib/supabase/server'
import { SideBar } from '@/components/layout/SideBar'
import { BottomNavBar } from '@/components/layout/BottomNavBar'
import type { UserRole } from '@/types/app.types'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: UserRole | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = (profile?.role ?? null) as UserRole | null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar role={role} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
      <BottomNavBar />
    </div>
  )
}
