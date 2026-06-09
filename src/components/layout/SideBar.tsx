'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogoHorizontal } from '@/components/ui/Logo'

import { Home, BookPlus, BookOpen, Palette, Users, Settings, Bell, LogOut, UserCircle, ClipboardList } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge, RoleBadge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/app.types'

const navItems = [
  { href: '/dashboard',     icon: Home,           label: '홈' },
  { href: '/profile',       icon: UserCircle,     label: '아이 프로필' },
  { href: '/observations',  icon: ClipboardList,  label: '행동 관찰하기' },
  { href: '/story/create',  icon: BookPlus,       label: '스토리 만들기' },
  { href: '/bookshelf',     icon: BookOpen,       label: '브릿지 책장' },
  { href: '/collab',        icon: Users,          label: '협업 공간' },
  { href: '/settings',      icon: Settings,       label: '설정' },
]

const CHILD_NAV_HREFS = ['/bookshelf', '/settings']

interface SideBarProps {
  pendingCount?: number
  role?: UserRole | null
}

export function SideBar({ pendingCount = 0, role }: SideBarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex flex-col w-60 h-full bg-white border-r border-gray-100 py-6">

      {/* 상단: 로고 + 역할 배지 */}
      <div className="px-5 mb-6">
        <Link href="/dashboard" className="block hover:opacity-80 transition-opacity">
          <LogoHorizontal size="sm" />
          <p className="text-xs text-soft-gray mt-1">우리 아이의 이야기</p>
        </Link>

        {role && (
          <div className="mt-3">
            <RoleBadge role={role} className="text-sm px-3 py-1" />
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 space-y-1">
        {(role === 'child' ? navItems.filter(i => CHILD_NAV_HREFS.includes(i.href)) : navItems).map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-sm font-medium',
                isActive
                  ? 'bg-mint-100 text-mint-700'
                  : 'text-soft-gray hover:bg-gray-50 hover:text-charcoal'
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{label}</span>
              {href === '/collab' && pendingCount > 0 && (
                <Badge variant="count" className="ml-auto">{pendingCount}</Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* 알림 */}
      {pendingCount > 0 && (
        <div className="mx-3 mb-4 p-3 bg-coral-500/10 rounded-xl border border-coral-300/30">
          <div className="flex items-center gap-2 text-coral-600 text-xs font-medium">
            <Bell size={14} />
            <span>승인 대기 {pendingCount}건</span>
          </div>
        </div>
      )}

      {/* 로그아웃 */}
      <div className="px-3 pt-2 border-t border-gray-100 mt-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-sm font-medium text-soft-gray hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} strokeWidth={1.8} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  )
}
