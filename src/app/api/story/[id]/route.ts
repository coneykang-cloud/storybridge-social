import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [storyRes, pagesRes] = await Promise.all([
    supabase.from('stories').select('*, children(name, age_group, interests, familiar_envs)').eq('id', id).single(),
    supabase.from('story_pages').select('*').eq('story_id', id).order('page_number'),
  ])

  if (!storyRes.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ story: storyRes.data, pages: pagesRes.data ?? [] })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title } = await request.json()
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: '제목을 입력해 주세요.' }, { status: 400 })
  }

  const { data: story } = await supabase
    .from('stories').select('creator_id').eq('id', id).single()
  if (!story || story.creator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('stories')
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ story: data })
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: story } = await supabase
    .from('stories')
    .select('child_id, creator_id, children(parent_id)')
    .eq('id', id)
    .single()

  const parentId = (story?.children as unknown as { parent_id: string } | null)?.parent_id
  const isOwner = parentId === user.id || story?.creator_id === user.id
  if (!story || !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Storage 이미지 파일 삭제 (실패해도 DB 삭제는 진행)
  try {
    const { data: files } = await supabase.storage
      .from('story-images')
      .list(`pages/${id}`)
    if (files && files.length > 0) {
      const paths = files.map((f) => `pages/${id}/${f.name}`)
      await supabase.storage.from('story-images').remove(paths)
    }
  } catch {
    // Storage 삭제 실패는 무시 — 고아 파일로 남아도 DB 삭제가 우선
  }

  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
