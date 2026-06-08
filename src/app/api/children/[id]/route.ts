import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: child, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', id)
    .eq('parent_id', user.id)
    .single()

  if (error || !child) return NextResponse.json({ error: '아동 정보를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json({ child })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('children')
    .update({
      name:           body.name,
      birth_year:     body.birth_year,
      age_group:      body.age_group,
      interests:      body.interests ?? [],
      familiar_envs:  body.familiar_envs ?? [],
      notes:          body.notes ?? null,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', id)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ child: data })
}
