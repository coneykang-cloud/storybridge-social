'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2, Check, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Avatar, AvatarStyle } from '@/types/app.types'

const STYLES: { value: AvatarStyle; emoji: string; label: string; desc: string }[] = [
  { value: 'ghibli',     emoji: '🎨', label: '지브리풍',   desc: '따뜻한 애니메이션' },
  { value: 'realistic',  emoji: '🪞', label: '사진닮은꼴', desc: '실제 모습 반영' },
  { value: 'pixar',      emoji: '🎬', label: '픽사풍',     desc: '3D 캐릭터' },
  { value: 'watercolor', emoji: '🖌️', label: '수채화',     desc: '부드러운 일러스트' },
]

interface AvatarStudioProps {
  childId: string
  childName: string
  childAge: number
  existingAvatars: Avatar[]
  onAvatarGenerated: (avatar: Avatar) => void
  onAvatarDeleted: (id: string) => void
  onAvatarSelected: (id: string) => void
}

export function AvatarStudio({
  childId,
  childName,
  childAge,
  existingAvatars,
  onAvatarGenerated,
  onAvatarDeleted,
  onAvatarSelected,
}: AvatarStudioProps) {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>('ghibli')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setPreviewUrl(URL.createObjectURL(file))
    setUploadedUrl(null)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('child_id', childId)

    try {
      const res = await fetch('/api/avatar/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '사진 업로드에 실패했어요. Supabase Storage 버킷(avatars)이 생성되어 있는지 확인해주세요.')
        // 미리보기는 유지 (사라지지 않음)
        return
      }
      setUploadedUrl(data.url)
    } catch {
      setError('사진 업로드에 실패했어요. 네트워크 연결을 확인해주세요.')
      // 미리보기는 유지
    }
  }, [childId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  })

  const handleGenerate = async () => {
    if (!uploadedUrl) { setError('사진을 먼저 업로드해 주세요.'); return }
    if (existingAvatars.length >= 5) { setError('아바타는 최대 5개까지 저장할 수 있어요.'); return }

    setIsGenerating(true)
    setError(null)

    try {
      // STEP 1: 예측 시작 (즉시 반환)
      const res = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, style: selectedStyle, photo_url: uploadedUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '아바타 생성에 실패했어요.'); return }

      // Dicebear 즉시 완료
      if (data.avatar) {
        onAvatarGenerated(data.avatar)
        setPreviewUrl(null); setUploadedUrl(null)
        return
      }

      // STEP 2: 폴링 (2초 간격, 최대 120초)
      const { prediction_id, child_id: cid, style: s, is_first } = data
      let attempts = 0
      while (attempts < 60) {
        await new Promise((r) => setTimeout(r, 2000))
        attempts++

        const poll = await fetch(
          `/api/avatar/status/${prediction_id}?child_id=${cid}&style=${s}&is_first=${is_first}`
        )
        const pollData = await poll.json()

        if (pollData.status === 'succeeded') {
          onAvatarGenerated(pollData.avatar)
          setPreviewUrl(null); setUploadedUrl(null)
          return
        }
        if (pollData.status === 'failed') {
          setError(pollData.error ?? '아바타 생성에 실패했어요.')
          return
        }
        // 'starting' | 'processing' → 계속 폴링
      }
      setError('생성 시간이 너무 오래 걸렸어요. 잠시 후 다시 시도해 주세요.')
    } catch (err) {
      setError('네트워크 오류가 발생했어요.')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate = existingAvatars.length < 5

  return (
    <div className="space-y-6">
      {/* 사진 업로드 */}
      <Card>
        <h3 className="font-semibold text-charcoal mb-3">STEP 1. 사진 업로드</h3>
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-mint-400 bg-mint-50' : 'border-gray-200 hover:border-mint-300',
            previewUrl && 'border-mint-400 bg-mint-50'
          )}
        >
          <input {...getInputProps()} />
          {previewUrl ? (
            <div className="flex justify-center">
              <Image src={previewUrl} alt="업로드된 사진" width={120} height={120}
                className="rounded-xl object-cover w-30 h-30" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-soft-gray">
              <Upload size={32} className="text-mint-300" />
              <p className="text-sm">
                {isDragActive ? '여기에 놓으세요!' : '사진을 끌어다 놓거나 탭해서 선택하세요'}
              </p>
              <p className="text-xs">JPEG / PNG, 최대 5MB, 얼굴이 잘 보이는 사진</p>
            </div>
          )}
        </div>
      </Card>

      {/* 스타일 선택 */}
      <Card>
        <h3 className="font-semibold text-charcoal mb-3">STEP 2. 스타일 선택</h3>
        <div className="grid grid-cols-2 gap-3">
          {STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => setSelectedStyle(style.value)}
              className={clsx(
                'flex flex-col items-center p-4 rounded-xl border-[1.5px] transition-all text-center',
                selectedStyle === style.value
                  ? 'border-mint-400 bg-mint-50 shadow-mint'
                  : 'border-gray-200 hover:border-mint-200'
              )}
            >
              <span className="text-2xl mb-1">{style.emoji}</span>
              <span className="font-medium text-sm text-charcoal">{style.label}</span>
              <span className="text-xs text-soft-gray mt-0.5">{style.desc}</span>
              {selectedStyle === style.value && (
                <Check size={14} className="text-mint-600 mt-1" />
              )}
            </button>
          ))}
        </div>
      </Card>

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {/* 업로드 상태 안내 */}
      {!uploadedUrl && previewUrl && (
        <p className="text-xs text-warning-amber text-center">
          📤 사진 업로드 중... 완료되면 버튼이 활성화됩니다
        </p>
      )}
      {!uploadedUrl && !previewUrl && (
        <p className="text-xs text-soft-gray text-center">
          STEP 1에서 사진을 먼저 업로드해주세요
        </p>
      )}

      <Button
        variant="cta"
        size="lg"
        fullWidth
        onClick={handleGenerate}
        loading={isGenerating}
        disabled={!uploadedUrl || !canGenerate}
      >
        {isGenerating ? '아바타 생성 중... (약 30초 소요)' : '아바타 만들기 ✨'}
      </Button>

      {/* 보유 아바타 */}
      {existingAvatars.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-charcoal">
              {childName}의 아바타 ({existingAvatars.length}/5)
            </h3>
          </div>
          <p className="text-xs text-soft-gray mb-3">
            아바타를 탭하면 프로필로 설정됩니다
          </p>
          <div className="grid grid-cols-3 gap-3">
            {existingAvatars.map((avatar) => (
              <div key={avatar.id} className="relative group flex flex-col items-center gap-1">
                {/* 아바타 이미지 — 탭으로 프로필 선택 */}
                <button
                  type="button"
                  onClick={async () => {
                    if (avatar.is_default) return
                    const res = await fetch(`/api/avatar/${avatar.id}/default`, { method: 'PATCH' })
                    if (res.ok) {
                      onAvatarSelected(avatar.id)
                    } else {
                      const data = await res.json()
                      alert(data.error ?? '설정에 실패했어요.')
                    }
                  }}
                  className="relative w-full"
                >
                  <Image
                    src={avatar.image_url}
                    alt={`${avatar.style} 아바타`}
                    width={100}
                    height={100}
                    className={clsx(
                      'rounded-xl object-cover w-full aspect-square transition-all',
                      avatar.is_default
                        ? 'ring-4 ring-mint-400 ring-offset-2'
                        : 'opacity-80 hover:opacity-100 hover:ring-2 hover:ring-mint-200'
                    )}
                  />
                  {/* 프로필 배지 */}
                  {avatar.is_default && (
                    <div className="absolute top-1 right-1 bg-mint-400 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                      <Check size={10} className="text-white" />
                      <span className="text-[9px] text-white font-bold">프로필</span>
                    </div>
                  )}
                </button>

                {/* 스타일 이름 */}
                <span className="text-[10px] text-soft-gray">
                  {avatar.style === 'ghibli' ? '지브리' :
                   avatar.style === 'pixar' ? '픽사' :
                   avatar.style === 'realistic' ? '사진닮은꼴' : '수채화'}
                </span>

                {/* 삭제 버튼 */}
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('이 아바타를 삭제할까요?')) return
                    const res = await fetch(`/api/avatar/${avatar.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      onAvatarDeleted(avatar.id)
                    } else {
                      const data = await res.json()
                      alert(data.error ?? '삭제에 실패했어요.')
                    }
                  }}
                  className="absolute -top-1 -left-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            {!canGenerate && (
              <div className="flex items-center justify-center aspect-square rounded-xl border-2 border-dashed border-gray-200 text-xs text-soft-gray text-center p-2">
                최대 5개
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
