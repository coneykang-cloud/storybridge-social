import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewObservationClient } from './NewObservationClient'
import type { UserRole } from '@/types/app.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NewObservationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/signin')

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <NewObservationClient role={profile.role as UserRole} />
    </div>
  )
}
