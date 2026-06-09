'use client'

import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { StoryPage } from '@/types/app.types'

interface StoryPdfButtonProps {
  title: string
  childName?: string
  homeConnectionMemo?: string | null
  pages: StoryPage[]
}

const CAPTURE_WIDTH = 800
const CAPTURE_HEIGHT = 1000

// A4 in points (595.28 x 841.89) — 2x2 그리드로 4장씩 배치
const A4_W = 595.28
const A4_H = 841.89
const CELL_W = A4_W / 2
const CELL_H = A4_H / 2

export function StoryPdfButton({ title, childName, homeConnectionMemo, pages }: StoryPdfButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    if (!containerRef.current || pages.length === 0) return
    setIsGenerating(true)
    setError(null)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageEls = containerRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]')

      const images: string[] = []
      for (let i = 0; i < pageEls.length; i++) {
        const canvas = await html2canvas(pageEls[i], { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
        images.push(canvas.toDataURL('image/jpeg', 0.92))
      }

      for (let i = 0; i < images.length; i++) {
        const posInSheet = i % 4
        const col = posInSheet % 2
        const row = Math.floor(posInSheet / 2)

        if (i > 0 && posInSheet === 0) pdf.addPage('a4', 'portrait')

        pdf.addImage(images[i], 'JPEG', col * CELL_W, row * CELL_H, CELL_W, CELL_H)
      }

      pdf.save(`${title || '스토리'}.pdf`)
    } catch (err) {
      console.error('PDF 생성 오류:', err)
      setError('PDF 생성 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={handleDownload} loading={isGenerating}>
        <Download size={16} className="mr-1.5" />
        PDF로 저장
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* 캡처용 숨김 렌더링 영역 — 화면에는 보이지 않지만 레이아웃 계산을 위해 DOM에 존재해야 함 */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" aria-hidden="true">
        <div ref={containerRef}>
          {pages.map((page, i) => {
            const pageText = [page.descriptive, page.perspective, page.coaching].filter(Boolean).join(' ')
            return (
              <div
                key={page.id}
                data-pdf-page
                style={{ width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT, backgroundColor: '#ffffff' }}
                className="flex flex-col p-10 font-sans"
              >
                {i === 0 && (
                  <div className="text-center mb-4">
                    <h1 className="text-3xl font-bold text-charcoal">{title}</h1>
                    {childName && <p className="text-base text-soft-gray mt-1">{childName}'s Story</p>}
                  </div>
                )}

                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-mint-50 mb-6">
                  {page.image_url && (
                    // html2canvas는 next/image의 lazy/srcset을 지원하지 않으므로 일반 img 태그 사용
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={page.image_url} crossOrigin="anonymous" alt={`페이지 ${i + 1}`} className="w-full h-full object-cover" />
                  )}
                </div>

                {page.chunking_label && (
                  <span className="inline-block bg-coral-500 text-white text-sm font-semibold px-3 py-1 rounded-lg mb-2 self-start">
                    {page.chunking_label}
                  </span>
                )}

                <p className="text-lg leading-relaxed font-medium text-charcoal">{pageText}</p>

                {i === pages.length - 1 && homeConnectionMemo && (
                  <div className="mt-4 p-3 bg-orange-50 rounded-xl">
                    <p className="text-sm font-semibold text-charcoal mb-1">🏠 가정 연계 메모</p>
                    <p className="text-sm text-charcoal">{homeConnectionMemo}</p>
                  </div>
                )}

                <p className="mt-auto text-right text-xs text-soft-gray">{i + 1} / {pages.length}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
