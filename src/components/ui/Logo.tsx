interface LogoProps {
  /** 사이즈 프리셋 */
  size?: 'sm' | 'md' | 'lg'
  /** 텍스트 표시 여부 */
  showText?: boolean
  className?: string
}

const sizeMap = {
  sm: { icon: 28, text: 'text-xl',  gap: 'gap-2' },
  md: { icon: 40, text: 'text-2xl', gap: 'gap-3' },
  lg: { icon: 56, text: 'text-4xl', gap: 'gap-3' },
}

/**
 * StoryBridge 로고 컴포넌트
 * - 다리 아치 SVG 아이콘 + "Story Bridge" 텍스트
 * - size="sm"  → 사이드바 등 작은 공간
 * - size="md"  → 일반 헤더
 * - size="lg"  → 로그인/회원가입 화면
 */
export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const { icon, text, gap } = sizeMap[size]

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 아이콘 */}
      <BridgeIcon size={icon} />

      {/* 텍스트 */}
      {showText && (
        <p className={`font-bold tracking-tight leading-none ${text} mt-1`}>
          <span className="text-charcoal">Story</span>
          <span className="text-mint-600">Bridge</span>
        </p>
      )}
    </div>
  )
}

/** 사이드바 전용 가로 배치 로고 */
export function LogoHorizontal({ size = 'sm', className = '' }: Omit<LogoProps, 'showText'>) {
  const { icon, text, gap } = sizeMap[size]

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      <BridgeIcon size={icon} />
      <p className={`font-bold tracking-tight leading-none ${text}`}>
        <span className="text-charcoal">Story</span>
        <span className="text-mint-600">Bridge</span>
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SVG 아이콘 – 로고 이미지의 다리 아치 모양 재현                        */
/* ------------------------------------------------------------------ */
function BridgeIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox="0 0 100 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 상단 빨간 원 (dot) */}
      <circle cx="50" cy="7" r="7" fill="#E07B6A" />

      {/* 메인 아치 (큰 반원) */}
      <path
        d="M10 62 Q10 18 50 18 Q90 18 90 62"
        stroke="#5BBFB5"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* 왼쪽 기둥 수직선 */}
      <line x1="10" y1="42" x2="10" y2="68" stroke="#5BBFB5" strokeWidth="7" strokeLinecap="round" />

      {/* 오른쪽 기둥 수직선 */}
      <line x1="90" y1="42" x2="90" y2="68" stroke="#5BBFB5" strokeWidth="7" strokeLinecap="round" />
    </svg>
  )
}
