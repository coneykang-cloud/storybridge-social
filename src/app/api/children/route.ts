import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcAgeGroup } from '@/types/app.types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('children')
    .select('*, avatars(id, style, image_url, is_default)')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ children: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, birth_year, interests, familiar_envs, notes } = await request.json()

  if (!name || !birth_year) {
    return NextResponse.json({ error: 'name and birth_year are required' }, { status: 400 })
  }

  const age_group = calcAgeGroup(birth_year)

  const { data, error } = await supabase
    .from('children')
    .insert({
      parent_id: user.id,
      name,
      birth_year,
      age_group,
      interests: interests ?? [],
      familiar_envs: familiar_envs ?? [],
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 그룹 자동 생성 (아동 1명 = 그룹 1개)
  await supabase.from('groups').insert({ child_id: data.id })
  // 보호자를 그룹 멤버로 추가
  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('child_id', data.id)
    .single()
  if (group) {
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'parent',
    })
  }

  return NextResponse.json({ child: data }, { status: 201 })
}

