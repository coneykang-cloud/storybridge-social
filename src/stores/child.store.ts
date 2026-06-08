import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Child, Avatar } from '@/types/app.types'

export type ChildWithAvatars = Child & { avatars: Avatar[] }

interface ChildStore {
  children: ChildWithAvatars[]
  selectedChild: ChildWithAvatars | null
  isLoading: boolean
  hasFetched: boolean
  fetchChildren: () => Promise<void>
  selectChild: (child: ChildWithAvatars) => void
  addChild: (child: ChildWithAvatars) => void
  updateChild: (id: string, updates: Partial<Child>) => void
}

export const useChildStore = create<ChildStore>((set) => ({
  children: [],
  selectedChild: null,
  isLoading: false,
  hasFetched: false,

  fetchChildren: async () => {
    set({ isLoading: true })
    const supabase = createClient()
    const { data } = await supabase
      .from('children')
      .select('*, avatars(id, style, image_url, is_default)')
      .order('created_at', { ascending: true })

    if (data) {
      const children = data as ChildWithAvatars[]
      set((state) => ({
        children,
        // 이미 선택된 아이가 있으면 유지 (페이지 이동 시 재조회로 선택이 초기화되지 않도록)
        selectedChild: children.find((c) => c.id === state.selectedChild?.id) ?? children[0] ?? null,
        isLoading: false,
        hasFetched: true,
      }))
    } else {
      set({ isLoading: false, hasFetched: true })
    }
  },

  selectChild: (child) => set({ selectedChild: child }),

  addChild: (child) =>
    set((state) => ({
      children: [child, ...state.children],
      selectedChild: state.selectedChild ?? child,
    })),

  updateChild: (id, updates) =>
    set((state) => ({
      children: state.children.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
      selectedChild:
        state.selectedChild?.id === id
          ? { ...state.selectedChild, ...updates }
          : state.selectedChild,
    })),
}))
