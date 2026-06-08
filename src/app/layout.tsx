import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StoryBridge — 우리 아이의 이야기, 함께 만들어요',
  description: 'ASD 아동을 위한 AI 기반 소셜 스토리 생성 플랫폼',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#A8D8D8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="bg-ivory font-sans text-charcoal antialiased">
        {children}
      </body>
    </html>
  )
}
