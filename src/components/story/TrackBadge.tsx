import { clsx } from 'clsx'
import { TRACK_META } from '@/types/app.types'
import type { Track } from '@/types/app.types'

interface TrackBadgeProps {
  track: Track
  size?: 'sm' | 'md'
  className?: string
}

export function TrackBadge({ track, size = 'sm', className }: TrackBadgeProps) {
  const meta = TRACK_META[track]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-lg font-medium text-charcoal',
        meta.bgClass,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </span>
  )
}
