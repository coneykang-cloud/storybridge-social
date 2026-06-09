import { clsx } from 'clsx'
import type { UserRole } from '@/types/app.types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'role' | 'status' | 'count'
  role?: UserRole
  className?: string
}

const roleStyles: Record<UserRole, string> = {
  parent:    'bg-mint-300 text-charcoal',
  therapist: 'bg-lavender-300 text-charcoal',
  teacher:   'bg-orange-100 text-charcoal',
  child:     'bg-yellow-100 text-charcoal',
}

const roleLabels: Record<UserRole, string> = {
  parent:    '보호자',
  therapist: '치료사',
  teacher:   '선생님',
  child:     '아이',
}

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium',
        roleStyles[role],
        className
      )}
    >
      {roleLabels[role]}
    </span>
  )
}

export function Badge({ children, variant = 'status', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-lg text-xs font-medium',
        variant === 'count' && 'min-w-[20px] h-5 px-1.5 bg-coral-500 text-white',
        variant === 'status' && 'px-2.5 py-0.5 bg-mint-100 text-mint-700',
        className
      )}
    >
      {children}
    </span>
  )
}
