import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// 실제 이미지 비율: 358 × 150 (width:height = 2.387:1)
const sizeMap = {
  sm:  { w: 120, h: 50  },
  md:  { w: 180, h: 75  },
  lg:  { w: 240, h: 101 },
}

/** 세로 배치 (로그인 페이지 등) */
export function Logo({ size = 'md', className = '' }: LogoProps) {
  const { w, h } = sizeMap[size]
  return (
    <Image
      src="/logo.png"
      alt="StoryBridge"
      width={w}
      height={h}
      className={className}
      priority
    />
  )
}

/** 가로 배치 – 사이드바 전용 */
export function LogoHorizontal({ size = 'sm', className = '' }: LogoProps) {
  const { w, h } = sizeMap[size]
  return (
    <Image
      src="/logo.png"
      alt="StoryBridge"
      width={w}
      height={h}
      className={className}
      priority
    />
  )
}
