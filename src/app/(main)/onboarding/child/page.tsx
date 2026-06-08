'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

const INTERESTS_OPTIONS = [
  '공룡', '기차', '자동차', '블록', '공주', '로봇', '동물', '물놀이',
  '그림 그리기', '음악', '춤', '책 읽기', '게임', '요리', '운동',
  '레고', '보드게임', '과학·실험', '유튜브', '만화·웹툰', 'K-pop',
  '축구', '농구', '수영', '자전거타기',
  '영화·드라마', '사진 찍기', '패션·쇼핑', '카페 탐방', '여행',
  '독서', '악기 연주', '글쓰기·일기', '뷰티·메이크업', '요가·명상',
]

const ENV_OPTIONS = [
  '집', '유치원', '학교', '놀이터', '공원', '할머니댁',
  '치료실', '마트', '병원', '도서관', '식당', '친구 집',
  '학원', '체육관', '수영장', '편의점',
  '카페', '독서실', 'PC방', '영화관', '쇼핑몰', '스포츠센터', '지하철·버스',
]

// calcAgeGroup은 types/app.types.ts에서 import
import { calcAgeGroup } from '@/types/app.types'

export default function ChildOnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')   // 수정 모드 시 child ID
  const isEditMode = !!editId

  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [envs, setEnvs] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(isEditMode)
  const [error, setError] = useState('')

  // 수정 모드: 기존 데이터 불러오기
  useEffect(() => {
    if (!editId) return
    const fetchChild = async () => {
      const res = await fetch(`/api/children/${editId}`)
      if (res.ok) {
        const { child } = await res.json()
        setName(child.name)
        setBirthYear(String(child.birth_year))
        setInterests(child.interests ?? [])
        setEnvs(child.familiar_envs ?? [])
        setNotes(child.notes ?? '')
      }
      setIsFetching(false)
    }
    fetchChild()
  }, [editId])

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !birthYear) return
    const year = parseInt(birthYear)
    const currentYear = new Date().getFullYear()
    if (isNaN(year) || year < currentYear - 18 || year > currentYear - 5) {
      setError(`생년도를 올바르게 입력해주세요. (${currentYear - 18}~${currentYear - 5}년)`)
      return
    }
    setError('')
    setIsLoading(true)

    const body = {
      name: name.trim(),
      birth_year: year,
      age_group: calcAgeGroup(year),
      interests,
      familiar_envs: envs,
      notes: notes.trim() || null,
    }

    const res = await fetch(
      isEditMode ? `/api/children/${editId}` : '/api/children',
      {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? '저장에 실패했어요. 다시 시도해주세요.')
      setIsLoading(false)
      return
    }

    router.push('/profile')
    router.refresh()
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-mint-400 text-4xl">✨</div>
      </div>
    )
  }

  return (
    <div className="px-5 py-6 max-w-xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.push('/profile')}
          className="text-sm text-soft-gray hover:text-charcoal"
        >
          ← 뒤로
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal">
          {isEditMode ? '아동 프로필 수정' : '아동 프로필 등록'}
        </h1>
        <p className="text-sm text-soft-gray mt-1">
          {isEditMode ? '정보를 수정하고 저장 버튼을 눌러주세요' : '아이 정보를 입력하면 맞춤 스토리를 만들 수 있어요'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <h2 className="text-sm font-semibold text-soft-gray uppercase tracking-wide mb-4">기본 정보</h2>
          <div className="space-y-4">
            <Input
              label="아이 이름"
              placeholder="예: 민준"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="출생 연도"
              placeholder="예: 2015"
              type="number"
              min={new Date().getFullYear() - 18}
              max={new Date().getFullYear() - 5}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              hint="만 5~18세 아동을 지원합니다 (미취학~고등학생)"
              required
            />
          </div>
        </Card>

        {/* 관심사 */}
        <Card>
          <h2 className="text-sm font-semibold text-soft-gray uppercase tracking-wide mb-1">
            관심사 <span className="text-soft-gray font-normal normal-case">(선택)</span>
          </h2>
          <p className="text-xs text-soft-gray mb-3">아이가 좋아하는 것을 골라주세요 (여러 개 가능)</p>

          <div className="flex flex-wrap gap-2">
            {INTERESTS_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleItem(interests, setInterests, item)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  interests.includes(item)
                    ? 'bg-mint-300 text-charcoal shadow-sm'
                    : 'bg-gray-100 text-soft-gray hover:bg-gray-200'
                }`}
              >
                {interests.includes(item) && <span className="mr-1">✓</span>}
                {item}
              </button>
            ))}
          </div>
        </Card>

        {/* 친숙한 환경 */}
        <Card>
          <h2 className="text-sm font-semibold text-soft-gray uppercase tracking-wide mb-1">
            친숙한 환경 <span className="text-soft-gray font-normal normal-case">(선택)</span>
          </h2>
          <p className="text-xs text-soft-gray mb-3">아이가 자주 가는 곳을 골라주세요</p>

          <div className="flex flex-wrap gap-2">
            {ENV_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleItem(envs, setEnvs, item)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  envs.includes(item)
                    ? 'bg-lavender-300 text-charcoal shadow-sm'
                    : 'bg-gray-100 text-soft-gray hover:bg-gray-200'
                }`}
              >
                {envs.includes(item) && <span className="mr-1">✓</span>}
                {item}
              </button>
            ))}
          </div>
        </Card>

        {/* 메모 */}
        <Card>
          <h2 className="text-sm font-semibold text-soft-gray uppercase tracking-wide mb-3">
            추가 메모 <span className="text-soft-gray font-normal normal-case">(선택)</span>
          </h2>
          <textarea
            placeholder="아이에 대해 치료사·선생님에게 전달하고 싶은 내용을 적어주세요"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-charcoal focus:outline-none focus:border-mint-300 resize-none min-h-[80px]"
          />
        </Card>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <Button type="submit" variant="cta" size="lg" fullWidth loading={isLoading}>
          {isEditMode ? '수정 저장하기' : '프로필 등록하기'}
        </Button>

        {!isEditMode && (
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-full text-center text-sm text-soft-gray hover:text-charcoal py-2"
          >
            나중에 등록하기
          </button>
        )}
      </form>
    </div>
  )
}
