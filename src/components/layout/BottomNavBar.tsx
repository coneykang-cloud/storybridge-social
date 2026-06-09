'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookPlus, BookOpen, Users, UserCircle, Settings } from 'lucide-react'
import { clsx } from 'clsx'
const navItems = [
  { href: '/dashboard',    icon: Home,       label: '홈' },
  { href: '/story/create', icon: BookPlus,   label: '스토리' },
  { href: '/bookshelf',    icon: BookOpen,   label: '책장' },
  { href: '/profile',      icon: UserCircle, label: '프로필' },
  { href: '/collab',       icon: Users,      label: '협업' },
  { href: '/settings',     icon: Settings,   label: '설정' },
]

export function BottomNavBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 md:hidden pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 min-w-[48px] py-2 transition-colors',
                isActive ? 'text-mint-600' : 'text-soft-gray'
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              {isActive && (
                <span className="text-[10px] font-medium">{label}</span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
