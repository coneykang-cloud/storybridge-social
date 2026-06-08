import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ObservationsClient } from './ObservationsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ObservationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  return (
    <div className="px-5 py-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-charcoal">행동 관찰하기</h1>
        <p className="text-sm text-soft-gray mt-1">ABC(선행자극·행동·결과)로 아이의 행동을 기록하고 분석해요</p>
      </div>

      <ObservationsClient />
    </div>
  )
}
