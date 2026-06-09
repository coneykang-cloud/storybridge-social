'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Contrast, Pencil, Check, X, KeyRound } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { RoleBadge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'

const ROLE_LABEL = { parent: '보호자', therapist: '치료사', teacher: '교사', child: '아이' }

export default function SettingsPage() {
  const router = useRouter()
  const { highContrast, toggleHighContrast } = useUIStore()
  const { profile, fetchProfile, setProfile } = useAuthStore()

  const [email, setEmail] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [pwResetSent, setPwResetSent] = useState(false)
  const [pwResetLoading, setPwResetLoading] = useState(false)

  useEffect(() => {
    if (!profile) fetchProfile()
  }, [profile, fetchProfile])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name)
      setPhone(profile.phone ?? '')
    }
  }, [profile])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  const handleEdit = () => { setSaveError(null); setIsEditing(true) }

  const handleCancel = () => {
    if (profile) { setFullName(profile.full_name); setPhone(profile.phone ?? '') }
    setIsEditing(false)
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!profile || !fullName.trim()) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', profile.id)
        .select()
        .single()
      if (error) throw error
      if (data) setProfile(data)
      setIsEditing(false)
    } catch {
      setSaveError('저장 중 오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!email) return
    setPwResetLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    })
    setPwResetSent(true)
    setPwResetLoading(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
    router.refresh()
  }

  return (
    <div className="px-5 py-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-charcoal mb-6">설정</h1>

      {/* 내 정보 — 프로필 + 로그인 계정 통합 */}
      {profile && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-soft-gray uppercase tracking-wide">내 정보</h2>
            {!isEditing && (
              <button onClick={handleEdit} className="p-1.5 rounded-lg hover:bg-gray-50 text-soft-gray hover:text-charcoal transition-colors">
                <Pencil size={15} />
              </button>
            )}
          </div>

          {/* 아바타 + 이름 헤더 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-mint-200 flex items-center justify-center text-mint-700 font-bold text-lg flex-shrink-0">
              {profile.full_name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-charcoal">{profile.full_name}</p>
              <RoleBadge role={profile.role} className="mt-1" />
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-soft-gray font-medium block mb-1">이름</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-mint-400"
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div>
                <label className="text-xs text-soft-gray font-medium block mb-1">이메일</label>
                <p className="text-sm text-charcoal px-3 py-2 bg-gray-50 rounded-xl">{email ?? '—'}</p>
              </div>
              <div>
                <label className="text-xs text-soft-gray font-medium block mb-1">전화번호 (선택)</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-mint-400"
                  placeholder="010-0000-0000"
                  type="tel"
                />
              </div>
              <div>
                <label className="text-xs text-soft-gray font-medium block mb-1">역할</label>
                <p className="text-sm text-charcoal px-3 py-2 bg-gray-50 rounded-xl">{ROLE_LABEL[profile.role]}</p>
              </div>
              {saveError && <p className="text-xs text-red-500">{saveError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !fullName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-mint-400 text-white rounded-xl text-sm font-medium hover:bg-mint-500 disabled:opacity-50 transition-colors"
                >
                  <Check size={14} />
                  {isSaving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-charcoal rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <X size={14} />
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-soft-gray">이메일</span>
                <span className="text-charcoal">{email ?? '불러오는 중...'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-soft-gray">전화번호</span>
                <span className="text-charcoal">{profile.phone || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-soft-gray">역할</span>
                <span className="text-charcoal">{ROLE_LABEL[profile.role]}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-soft-gray">비밀번호</span>
                {pwResetSent ? (
                  <span className="text-xs text-mint-600 font-medium">재설정 메일 발송됨 ✓</span>
                ) : (
                  <button
                    onClick={handlePasswordReset}
                    disabled={pwResetLoading || !email}
                    className="flex items-center gap-1 text-xs text-mint-600 font-medium hover:text-mint-700 disabled:opacity-50 transition-colors"
                  >
                    <KeyRound size={12} />
                    {pwResetLoading ? '발송 중...' : '재설정 메일 받기'}
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 접근성 */}
      <Card>
        <h2 className="text-sm font-semibold text-soft-gray uppercase tracking-wide mb-3">접근성</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Contrast size={20} className="text-charcoal" />
            <div>
              <p className="font-medium text-charcoal text-sm">고대비 모드</p>
              <p className="text-xs text-soft-gray">배경 흰색, 텍스트 검정으로 변경</p>
            </div>
          </div>
          <button
            onClick={toggleHighContrast}
            className={`relative w-11 h-6 rounded-full transition-colors ${highContrast ? 'bg-mint-400' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${highContrast ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </Card>

      {/* 계정 관리 */}
      <Card>
        <h2 className="text-sm font-semibold text-soft-gray uppercase tracking-wide mb-3">계정 관리</h2>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full py-2 text-red-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">로그아웃</span>
        </button>
      </Card>

      <p className="text-center text-xs text-soft-gray pt-4">StoryBridge MVP v3.0</p>
    </div>
  )
}
