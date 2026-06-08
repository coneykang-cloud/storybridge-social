import { redirect } from 'next/navigation'

// 아바타 스튜디오는 아이 프로필로 통합됨
export default function AvatarStudioPage() {
  redirect('/profile')
}
