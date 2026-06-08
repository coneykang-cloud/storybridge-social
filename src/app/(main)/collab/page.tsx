import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { RoleBadge } from '@/components/ui/Badge'
import { JoinGroupForm } from './JoinGroupForm'

export default async function CollabIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: memberships } = await supabase
    .from('group_members')
    .select(`
      role, joined_at,
      groups (
        id, invite_code,
        children (name, age_group)
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const groups = memberships ?? []

  return (
    <div className="px-5 py-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-charcoal">협업 공간</h1>

      {groups.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium text-charcoal">연결된 그룹이 없어요</p>
          <p className="text-sm text-soft-gray mt-1">초대 코드로 그룹에 참여해보세요</p>
        </div>
      ) : (
        groups.map((m) => {
          const group = m.groups as unknown as { id: string; invite_code: string; children: { name: string } | null } | null
          if (!group) return null
          return (
            <Link key={group.id} href={`/collab/${group.id}`}>
              <Card hover>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-charcoal">
                      {group.children?.name ?? '아동'} 그룹
                    </p>
                    <p className="text-xs text-soft-gray mt-0.5">
                      초대코드: <span className="font-mono font-bold text-mint-600">{group.invite_code}</span>
                    </p>
                  </div>
                  <RoleBadge role={m.role as 'parent' | 'therapist' | 'teacher'} />
                </div>
              </Card>
            </Link>
          )
        })
      )}

      <JoinGroupForm />
    </div>
  )
}

