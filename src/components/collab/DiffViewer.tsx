'use client'

import { clsx } from 'clsx'
import type { StoryPage } from '@/types/app.types'

interface DiffViewerProps {
  before: Partial<StoryPage>
  after: Partial<StoryPage>
}

const FIELDS: { key: keyof StoryPage; label: string }[] = [
  { key: 'descriptive', label: '설명문' },
  { key: 'perspective', label: '조망문' },
  { key: 'coaching',    label: '지시문' },
]

type DiffToken = { type: 'equal' | 'remove' | 'add'; value: string }

// 공백 단위로 토큰화 (공백 자체도 토큰으로 유지해 원문 간격 보존)
function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0)
}

// LCS 기반 토큰 단위 diff — 바뀐 단어/구절만 강조하기 위함
function diffTokens(before: string[], after: string[]): DiffToken[] {
  const m = before.length
  const n = after.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = before[i] === after[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const result: DiffToken[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (before[i] === after[j]) {
      result.push({ type: 'equal', value: before[i] })
      i++; j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'remove', value: before[i] })
      i++
    } else {
      result.push({ type: 'add', value: after[j] })
      j++
    }
  }
  while (i < m) { result.push({ type: 'remove', value: before[i] }); i++ }
  while (j < n) { result.push({ type: 'add', value: after[j] }); j++ }
  return result
}

export function DiffViewer({ before, after }: DiffViewerProps) {
  const hasChanges = FIELDS.some((f) => before[f.key] !== after[f.key])

  if (!hasChanges) {
    return <p className="text-sm text-soft-gray text-center py-4">변경 내용이 없어요</p>
  }

  return (
    <div className="space-y-3">
      {FIELDS.map(({ key, label }) => {
        const bVal = before[key] as string | undefined
        const aVal = after[key] as string | undefined
        if (bVal === aVal) return null

        const tokens = bVal && aVal ? diffTokens(tokenize(bVal), tokenize(aVal)) : null

        return (
          <div key={key} className="text-sm">
            <p className="font-medium text-charcoal mb-1">{label}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className={clsx('p-3 rounded-lg', bVal ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200')}>
                <p className="text-xs text-red-500 font-medium mb-1">변경 전</p>
                <p className="text-charcoal leading-relaxed break-keep">
                  {tokens
                    ? tokens
                        .filter((t) => t.type !== 'add')
                        .map((t, idx) => t.type === 'remove'
                          ? <mark key={idx} className="bg-red-200 text-red-700 line-through rounded px-0.5">{t.value}</mark>
                          : <span key={idx}>{t.value}</span>
                        )
                    : (bVal ?? '(없음)')}
                </p>
              </div>
              <div className={clsx('p-3 rounded-lg', aVal ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200')}>
                <p className="text-xs text-success-green font-medium mb-1">변경 후</p>
                <p className="text-charcoal leading-relaxed break-keep">
                  {tokens
                    ? tokens
                        .filter((t) => t.type !== 'remove')
                        .map((t, idx) => t.type === 'add'
                          ? <mark key={idx} className="bg-warning-amber/40 text-charcoal rounded px-0.5">{t.value}</mark>
                          : <span key={idx}>{t.value}</span>
                        )
                    : (aVal ?? '(없음)')}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
