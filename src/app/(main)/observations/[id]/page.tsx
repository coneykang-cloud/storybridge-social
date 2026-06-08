import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ObservationDetailClient } from './ObservationDetailClient'
import type { UserRole } from '@/types/app.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ObservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/signin')

  if (!id) notFound()

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <ObservationDetailClient observationId={id} role={profile.role as UserRole} userId={user.id} />
    </div>
  )
}
