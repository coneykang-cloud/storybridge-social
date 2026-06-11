'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore } from '@/stores/ui.store'
import type { StoryPage, ViewerMode, TTSVoice, PresentationMode, Track } from '@/types/app.types'
import { CumulativeStrip } from './CumulativeStrip'

interface StoryViewerProps {
  title?: string
  childName?: string
  pages: StoryPage[]
  mode?: ViewerMode
  voice?: TTSVoice
  highContrast?: boolean
  presentationMode?: PresentationMode
  track?: Track
  homeConnectionMemo?: string
}

export function StoryViewer({
  title,
  childName,
  pages,
  mode: propMode,
  voice: propVoice,
  presentationMode = 'sequential',
  track,
  homeConnectionMemo,
}: StoryViewerProps) {
  const { viewerMode, slideshowInterval, ttsVoice, highContrast } = useUIStore()
  const mode = propMode ?? viewerMode
  const voice = propVoice ?? ttsVoice

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const slideshowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const page = pages[currentIndex]
  const total = pages.length

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, total - 1))
  }, [total])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }, [])

  useEffect(() => {
    if (mode !== 'slideshow' || !isPlaying) return
    slideshowTimerRef.current = setTimeout(() => {
      if (currentIndex < total - 1) goNext()
      else setIsPlaying(false)
    }, slideshowInterval * 1000)
    return () => { if (slideshowTimerRef.current) clearTimeout(slideshowTimerRef.current) }
  }, [mode, isPlaying, currentIndex, total, slideshowInterval, goNext])

  const playTTS = useCallback(async () => {
    if (!page) return
    try {
      const text = [page.descriptive, page.perspective, page.coaching].filter(Boolean).join(' ')
      const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}&voice=${voice}&page_id=${page.id}`)
      const data = await res.json()
      if (audioRef.current && data.audio_url) {
        audioRef.current.src = data.audio_url
        audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (err) {
      console.error('TTS error:', err)
    }
  }, [page, voice])

  // autoplay 모드: 페이지가 바뀌면 자동으로 TTS 시작
  useEffect(() => {
    if (mode !== 'autoplay') return
    playTTS()
  }, [mode, currentIndex, playTTS])

  if (!page) return null

  const bg = highContrast ? 'bg-white' : 'bg-white'
  const textColor = highContrast ? 'text-black' : 'text-charcoal'

  // 전체 텍스트 조합
  const pageText = [page.descriptive, page.perspective, page.coaching]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={clsx('flex flex-col h-full', bg)}>

      {/* 상단: 제목 */}
      {title && (
        <div className="text-center pt-6 pb-4 px-4">
          <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
          {childName && (
            <p className="text-sm text-soft-gray mt-0.5">{childName}'s Story</p>
          )}
        </div>
      )}

      {/* 메인: 이미지(좌) + 텍스트(우) */}
      <div className="flex-1 flex flex-col md:flex-row items-center gap-6 px-6 pb-4 min-h-0 overflow-y-auto">

        {/* 이미지 영역 */}
        <div className="w-full md:w-[48%] flex-shrink-0">
          <div className={clsx(
            'relative rounded-2xl overflow-hidden',
            'aspect-square md:aspect-[4/3]',
            'bg-mint-50 shadow-md'
          )}>
            {page.image_url ? (
              <Image
                src={page.image_url}
                alt={`페이지 ${currentIndex + 1}`}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-mint-300">
                <span className="text-6xl">📖</span>
                <span className="text-sm text-soft-gray">이미지 생성 중...</span>
              </div>
            )}
          </div>
        </div>

        {/* 텍스트 영역 */}
        <div className="w-full md:w-[52%] flex flex-col justify-center">

          {/* 청킹 표지어 */}
          {page.chunking_label && (
            <span className="inline-block bg-coral-500 text-white text-sm font-semibold px-3 py-1 rounded-lg mb-3 self-start">
              {page.chunking_label}
            </span>
          )}

          {/* 본문 텍스트 */}
          <p className={clsx(
            'leading-relaxed font-medium',
            highContrast ? 'text-black text-2xl' : 'text-charcoal text-xl md:text-2xl',
          )}>
            {pageText}
          </p>

          {/* 조망문 (별도 박스) */}
          {page.perspective && page.descriptive !== page.perspective && (
            <div className={clsx(
              'mt-4 p-3 rounded-xl text-base leading-relaxed',
              highContrast ? 'border-2 border-black' : 'bg-lavender-50 border border-lavender-200 text-charcoal'
            )}>
              {page.perspective}
            </div>
          )}

          {/* 지시문 */}
          {page.coaching && (
            <div className={clsx(
              'mt-3 flex gap-2 p-3 rounded-xl text-base leading-relaxed',
              highContrast ? 'border-2 border-black' : 'bg-mint-50 border border-mint-200 text-charcoal'
            )}>
              <span>✅</span>
              <span>{page.coaching}</span>
            </div>
          )}

          {/* 누적 제시 스트립 */}
          {presentationMode === 'cumulative' && page.cumulative_strip_text && (
            <CumulativeStrip stripText={page.cumulative_strip_text} highContrast={highContrast} />
          )}

          {/* Track C 가정 연계 메모 */}
          {homeConnectionMemo && currentIndex === total - 1 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-sm font-semibold text-charcoal mb-1">🏠 가정 연계 메모</p>
              <p className="text-sm text-charcoal">{homeConnectionMemo}</p>
            </div>
          )}

          {/* TTS 버튼 */}
          <button
            onClick={playTTS}
            className="mt-5 self-start flex items-center gap-2 px-4 py-2 bg-mint-100 text-mint-700 rounded-xl text-sm font-medium hover:bg-mint-200 transition-colors"
          >
            <Volume2 size={16} />
            읽어주기
          </button>
        </div>
      </div>

      {/* 하단: 페이지 네비게이션 */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
        {/* 이전 버튼 */}
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
            currentIndex === 0
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-mint-100 text-mint-700 hover:bg-mint-200'
          )}
        >
          <ChevronLeft size={20} />
        </button>

        {/* 페이지 인디케이터 */}
        <div className="flex gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={clsx(
                'rounded-full transition-all',
                i === currentIndex ? 'w-5 h-2 bg-coral-500' : 'w-2 h-2 bg-gray-200 hover:bg-mint-200'
              )}
            />
          ))}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={goNext}
          disabled={currentIndex === total - 1}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
            currentIndex === total - 1
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-coral-500 text-white hover:bg-coral-600 shadow-coral'
          )}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <audio ref={audioRef} onEnded={() => mode === 'autoplay' && goNext()} />
    </div>
  )
}
