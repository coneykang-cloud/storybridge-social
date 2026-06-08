import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storyId = request.nextUrl.searchParams.get('story_id')
  if (!storyId) return NextResponse.json({ error: 'story_id is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('comments')
    .select('*, author:user_profiles(id, full_name, role)')
    .eq('story_id', storyId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { story_id, page_id, content } = await request.json()
  if (!story_id || !content?.trim()) {
    return NextResponse.json({ error: 'story_id and content are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      story_id,
      page_id: page_id ?? null,
      author_id: user.id,
      content: content.trim(),
    })
    .select('*, author:user_profiles(id, full_name, role)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data }, { status: 201 })
}

// 읽음 처리
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { story_id } = await request.json()

  await supabase
    .from('comments')
    .update({ is_read: true })
    .eq('story_id', story_id)
    .neq('author_id', user.id)

  return NextResponse.json({ ok: true })
}

