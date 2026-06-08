import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import type { StoryPool } from '@/types/app.types'

const AGE_GROUPS = [
  { value: '7-9',   label: '7~9세' },
  { value: '10-13', label: '10~13세' },
  { value: '14-18', label: '14~18세' },
]
const CATEGORIES = [
  { value: 'school', label: '🏫 학교생활·또래관계' },
  { value: 'daily',  label: '🏠 일상생활·감정조절' },
]

interface Props {
  searchParams: Promise<{ age_group?: string; category?: string }>
}

export default async function PoolPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { age_group, category } = await searchParams

  let query = supabase.from('story_pool').select('*').order('age_group').order('title')
  if (age_group) query = query.eq('age_group', age_group)
  if (category)  query = query.eq('category', category)

  const { data: templates } = await query
  const pools = (templates ?? []) as StoryPool[]

  return (
    <div className="px-5 py-6 max-w-xl mx-auto">
      <Link href="/story/create" className="text-sm text-soft-gray mb-4 flex items-center gap-1">
        ← 뒤로
      </Link>
      <h1 className="text-2xl font-bold text-charcoal mb-5">템플릿 선택</h1>

      {/* 연령대 필터 */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <Link
          href="/story/create/pool"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            !age_group ? 'bg-mint-300 text-charcoal' : 'bg-gray-100 text-soft-gray hover:bg-gray-200'
          }`}
        >전체</Link>
        {AGE_GROUPS.map((g) => (
          <Link
            key={g.value}
            href={`/story/create/pool?age_group=${g.value}${category ? `&category=${category}` : ''}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              age_group === g.value ? 'bg-mint-300 text-charcoal' : 'bg-gray-100 text-soft-gray hover:bg-gray-200'
            }`}
          >{g.label}</Link>
        ))}
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <Link
          href={`/story/create/pool${age_group ? `?age_group=${age_group}` : ''}`}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            !category ? 'bg-lavender-300 text-charcoal' : 'bg-gray-100 text-soft-gray hover:bg-gray-200'
          }`}
        >전체</Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/story/create/pool?category=${c.value}${age_group ? `&age_group=${age_group}` : ''}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              category === c.value ? 'bg-lavender-300 text-charcoal' : 'bg-gray-100 text-soft-gray hover:bg-gray-200'
            }`}
          >{c.label}</Link>
        ))}
      </div>

      {pools.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-charcoal font-medium">해당하는 템플릿이 없어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pools.map((pool) => (
            <Link key={pool.id} href={`/story/create/pool/${pool.id}`}>
              <Card hover>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-mint-100 rounded-xl">
                    <span className="text-xl">{pool.category === 'school' ? '🏫' : '🏠'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal">{pool.title}</p>
                    <p className="text-sm text-soft-gray mt-0.5">{pool.description}</p>
                    <div className="flex gap-1.5 mt-2">
                      <span className="text-xs bg-mint-100 text-mint-700 px-2 py-0.5 rounded-md">
                        {AGE_GROUPS.find((g) => g.value === pool.age_group)?.label}
                      </span>
                      {pool.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs bg-gray-100 text-soft-gray px-2 py-0.5 rounded-md">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

