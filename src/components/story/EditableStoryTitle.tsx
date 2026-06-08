'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'

interface Props {
  storyId: string
  title: string
  editable: boolean
}

export function EditableStoryTitle({ storyId, title, editable }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!value.trim() || value.trim() === title) {
      setEditing(false)
      setValue(title)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/story/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: value.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? '제목 수정에 실패했어요')
      }
      setEditing(false)
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!editable) {
    return <h1 className="text-2xl font-bold text-charcoal mt-1">{title}</h1>
  }

  if (editing) {
    return (
      <div className="mt-1">
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') { setEditing(false); setValue(title); setError(null) }
            }}
            disabled={saving}
            className="text-2xl font-bold text-charcoal bg-mint-50 rounded-lg px-2 py-0.5 outline-none ring-2 ring-mint-300 w-full"
          />
          <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg text-mint-600 hover:bg-mint-50 flex-shrink-0">
            <Check size={18} />
          </button>
          <button
            onClick={() => { setEditing(false); setValue(title); setError(null) }}
            disabled={saving}
            className="p-1.5 rounded-lg text-soft-gray hover:bg-gray-50 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 mt-1 text-left"
    >
      <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
      <Pencil size={15} className="text-soft-gray opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  )
}
