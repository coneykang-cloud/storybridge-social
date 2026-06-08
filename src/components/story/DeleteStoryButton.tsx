'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  storyId: string
  storyTitle: string
}

export function DeleteStoryButton({ storyId, storyTitle }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/story/${storyId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? '삭제에 실패했어요')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        fullWidth
        className="gap-2 text-red-500 hover:bg-red-50 hover:text-red-600"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={18} /> 삭제
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-5 pb-8">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="text-center space-y-2">
              <p className="text-2xl">🗑️</p>
              <h2 className="text-lg font-bold text-charcoal">스토리를 삭제할까요?</h2>
              <p className="text-sm text-soft-gray">
                <span className="font-medium text-charcoal">&ldquo;{storyTitle}&rdquo;</span>을 삭제하면<br />
                모든 페이지와 이미지가 영구 삭제됩니다.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => { setOpen(false); setError(null) }}
                disabled={loading}
              >
                취소
              </Button>
              <Button
                variant="cta"
                fullWidth
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
