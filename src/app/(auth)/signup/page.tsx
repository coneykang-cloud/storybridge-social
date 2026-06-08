'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/app.types'

const ROLES: { value: UserRole; emoji: string; label: string; desc: string }[] = [
  { value: 'parent',    emoji: '🧑‍👧', label: '보호자',   desc: '아이의 부모 또는 양육자' },
  { value: 'therapist', emoji: '🩺',   label: '치료사',   desc: '언어·행동 치료사' },
  { value: 'teacher',   emoji: '👩‍🏫', label: '선생님',   desc: '특수교사 또는 일반교사' },
]

type Step = 1 | 2

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [role, setRole] = useState<UserRole | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const needsPhone = role === 'therapist' || role === 'teacher'

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length < 4) return digits
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  const handleRoleSelect = (r: UserRole) => {
    setRole(r)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return

    // 치료사·선생님은 연락처 필수
    if (needsPhone && !phone.trim()) {
      setError('치료사·선생님은 자격 검증을 위해 연락처를 입력해 주세요.')
      return
    }

    setError('')
    setIsLoading(true)

    const supabase = createClient()

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        role,
        phone: needsPhone ? phone.trim() : undefined,
      }),
    })

    const resData = await res.json()

    if (!res.ok) {
      setError(resData.error ?? '회원가입에 실패했어요. 다시 시도해 주세요.')
      setIsLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('가입됐어요! 로그인 화면에서 로그인해주세요.')
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-5 bg-ivory">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-charcoal">
          Story<span className="text-mint-600">Bridge</span>
        </h1>
      </div>

      {/* STEP 1: 역할 선택 */}
      {step === 1 && (
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-charcoal text-center mb-2">안녕하세요! 👋</h2>
          <p className="text-soft-gray text-center mb-8">어떤 분이신가요?</p>

          <div className="space-y-3">
            {ROLES.map(({ value, emoji, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRoleSelect(value)}
                className={clsx(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-[1.5px] text-left',
                  'transition-all hover:border-mint-300 hover:bg-mint-50',
                  value === 'parent' ? 'border-coral-300 bg-coral-500/5' : 'border-gray-200 bg-white'
                )}
              >
                <span className="text-3xl">{emoji}</span>
                <div>
                  <div className="font-semibold text-charcoal">{label}</div>
                  <div className="text-sm text-soft-gray">{desc}</div>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-soft-gray mt-6">
            이미 계정이 있으신가요?{' '}
            <Link href="/signin" className="text-mint-600 font-medium hover:underline">로그인</Link>
          </p>
        </div>
      )}

      {/* STEP 2: 계정 정보 입력 */}
      {step === 2 && role && (
        <div className="w-full max-w-sm">
          <button type="button" onClick={() => setStep(1)} className="text-sm text-soft-gray mb-6 hover:text-charcoal">
            ← 뒤로
          </button>
          <h2 className="text-xl font-bold text-charcoal mb-1">
            {ROLES.find((r) => r.value === role)?.emoji}{' '}
            {ROLES.find((r) => r.value === role)?.label}로 가입
          </h2>
          {needsPhone && (
            <p className="text-xs text-soft-gray mb-5">
              🔒 치료사·선생님은 자격 검증을 위해 연락처를 등록합니다
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="이름"
              placeholder="이름을 입력하세요"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="이메일"
              type="email"
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="비밀번호"
              type="password"
              placeholder="8자 이상 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />

            {/* 치료사·선생님 전용: 연락처 */}
            {needsPhone && (
              <Input
                label="연락처 (필수)"
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                hint="자격 검증 목적으로만 사용되며 외부에 공개되지 않습니다"
                required
              />
            )}

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button type="submit" variant="cta" size="lg" fullWidth loading={isLoading}>
              가입하기
            </Button>

            <p className="text-center text-sm text-soft-gray mt-2">
              이미 계정이 있으신가요?{' '}
              <Link href="/signin" className="text-mint-600 font-medium hover:underline">
                로그인
              </Link>
            </p>
          </form>
        </div>
      )}
    </div>
  )
}
