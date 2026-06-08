'use client'

import { clsx } from 'clsx'

interface CumulativeStripProps {
  stripText: string
  highContrast?: boolean
}

interface StripLine {
  type: 'done' | 'current'
  text: string
}

function parseStripText(raw: string): StripLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('✅') || line.startsWith('☑') || line.startsWith('✓')) {
        return { type: 'done' as const, text: line.replace(/^[✅☑✓]\s*/, '') }
      }
      if (line.startsWith('▶') || line.startsWith('▷') || line.startsWith('→')) {
        return { type: 'current' as const, text: line.replace(/^[▶▷→]\s*/, '') }
      }
      // 기본적으로 마지막 줄은 현재 단계
      return { type: 'current' as const, text: line }
    })
}

export function CumulativeStrip({ stripText, highContrast = false }: CumulativeStripProps) {
  if (!stripText?.trim()) return null

  const lines = parseStripText(stripText)
  if (lines.length === 0) return null

  return (
    <div className={clsx(
      'mt-4 rounded-xl p-3',
      highContrast ? 'bg-white border-2 border-black' : 'bg-gray-50 border border-gray-100'
    )}>
      <p className={clsx(
        'text-xs font-medium mb-2',
        highContrast ? 'text-black' : 'text-soft-gray'
      )}>
        ── 지금까지 한 것들 ──
      </p>

      <div className="space-y-1 max-h-[30vh] overflow-y-auto">
        {lines.map((line, i) => (
          <div
            key={i}
            className={clsx(
              'flex items-start gap-2 px-2 py-1.5 rounded-lg',
              line.type === 'done' && !highContrast && 'text-mint-500 opacity-70',
              line.type === 'done' && highContrast && 'text-black opacity-50',
              line.type === 'current' && !highContrast && 'border-l-2 border-coral-500 bg-coral-500/5 text-charcoal font-semibold',
              line.type === 'current' && highContrast && 'border-l-2 border-black bg-gray-100 text-black font-bold',
            )}
          >
            <span className="flex-shrink-0 text-sm">
              {line.type === 'done' ? '✅' : '▶'}
            </span>
            <span className={clsx(
              line.type === 'done' ? 'text-[13px]' : 'text-[14px]'
            )}>
              {line.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
