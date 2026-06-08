'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Contrast } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { RoleBadge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'

export default function SettingsPage() {
  const router = useRouter()
  const { highContrast, toggleHighContrast } = useUIStore()
  const { profile, fetchProfile } = useAuthStore()

  useEffect(() => {
    if (!profile) fetchProfile()
  }, [profile, fetchProfile])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
    router.refresh()
  }

  return (
    <div className="px-5 py-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-charcoal mb-6">설정</h1>

      {/* 내 계정 정보 */}
      {profile && (
        <Card>
          <h2 className="text-sm font-semibold text-soft-gray uppercase tracking-wide mb-3">내 계정</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-mint-200 flex items-center justify-center text-mint-700 font-bold text-lg">
              {profile.full_name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-charcoal">{profile.full_name}</p>
              <RoleBadge role={profile.role} className="mt-1" />
            </div>
          </div>
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
            className={`relative w-11 h-6 rounded-full transition-colors ${
              highContrast ? 'bg-mint-400' : 'bg-gray-200'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              highContrast ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </Card>

      {/* 로그아웃 */}
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

      <p className="text-center text-xs text-soft-gray pt-4">
        StoryBridge MVP v3.0
      </p>
    </div>
  )
}
