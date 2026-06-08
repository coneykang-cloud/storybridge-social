import { redirect } from 'next/navigation'

// Track B(보호자 주도) 페이지로 통합됨
export default function AIStoryCreatePage() {
  redirect('/story/create/parent')
}
