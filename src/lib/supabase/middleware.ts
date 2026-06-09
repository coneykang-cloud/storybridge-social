import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/signin') || pathname.startsWith('/signup')
  const isApiRoute  = pathname.startsWith('/api')

  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    const role = user.user_metadata?.role as string | undefined
    url.pathname = role === 'child' ? '/bookshelf' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // child 역할: 브릿지 책장·스토리 읽기·설정만 허용, 스토리 생성은 차단
  if (user && !isApiRoute) {
    const role = user.user_metadata?.role as string | undefined
    const CHILD_ALLOWED = ['/bookshelf', '/settings', '/story']
    const CHILD_BLOCKED = ['/story/create']
    if (
      role === 'child' &&
      (!CHILD_ALLOWED.some(p => pathname.startsWith(p)) || CHILD_BLOCKED.some(p => pathname.startsWith(p)))
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/bookshelf'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
