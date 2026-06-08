import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/app.types'

export async function POST(request: NextRequest) {
  const { email, password, full_name, role, phone } = await request.json() as {
    email: string
    password: string
    full_name: string
    role: UserRole
    phone?: string
  }

  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 })
  }

  // 치료사·선생님 연락처 필수 검증
  if ((role === 'therapist' || role === 'teacher') && !phone?.trim()) {
    return NextResponse.json({ error: '치료사·선생님은 연락처가 필요합니다.' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // 이메일 중복 체크 — getUserByEmail이 없으므로 listUsers + filter 사용
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  if (existing) {
    return NextResponse.json({ error: '이미 가입된 이메일이에요. 로그인해 주세요.' }, { status: 409 })
  }

  // 신규 유저 생성
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    // 이미 가입된 이메일 — 가장 먼저 체크 (email 포함 문구이므로 순서 중요)
    if (
      msg.includes('already registered') ||
      msg.includes('already been registered') ||
      msg.includes('already exists') ||
      msg.includes('already in use') ||
      msg.includes('duplicate')
    ) {
      return NextResponse.json({ error: '이미 가입된 이메일이에요. 로그인해 주세요.' }, { status: 409 })
    }
    if (msg.includes('password') && (msg.includes('short') || msg.includes('weak'))) {
      return NextResponse.json({ error: '비밀번호는 8자 이상이어야 해요.' }, { status: 400 })
    }
    if (msg.includes('invalid email') || msg.includes('email format')) {
      return NextResponse.json({ error: '이메일 형식이 올바르지 않아요.' }, { status: 400 })
    }
    return NextResponse.json({ error: '회원가입에 실패했어요. 다시 시도해 주세요.' }, { status: 400 })
  }

  await supabase.from('user_profiles').upsert({
    id: data.user.id,
    full_name,
    role,
    phone: phone ?? null,
  })

  return NextResponse.json({ ok: true })
}
