'use client'

import { useState } from 'react'

export function JoinGroupForm() {
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const join = async () => {
    if (!code.trim()) return
    setIsLoading(true)
    const res = await fetch('/api/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg('그룹에 참여했어요! 페이지를 새로고침해 주세요.')
      window.location.reload()
    } else {
      setMsg(data.error ?? '참여에 실패했어요.')
    }
    setIsLoading(false)
  }

  return (
    <div className="mt-4 p-4 bg-mint-50 rounded-xl border border-mint-200">
      <p className="text-sm font-medium text-charcoal mb-2">초대 코드로 참여하기</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="초대 코드 6자리"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-mint-300"
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
        <button
          onClick={join}
          disabled={isLoading || !code.trim()}
          className="px-4 py-2 bg-mint-300 text-charcoal rounded-xl text-sm font-medium hover:bg-mint-400 disabled:opacity-50"
        >
          {isLoading ? '...' : '참여'}
        </button>
      </div>
      {msg && <p className="text-xs mt-2 text-charcoal">{msg}</p>}
    </div>
  )
}
