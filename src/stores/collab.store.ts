import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Approval, Comment, Notification } from '@/types/app.types'

interface CollabStore {
  pendingApprovals: Approval[]
  comments: Comment[]
  notifications: Notification[]
  channel: RealtimeChannel | null

  setPendingApprovals: (approvals: Approval[]) => void
  setComments: (comments: Comment[]) => void
  addComment: (comment: Comment) => void
  addNotification: (n: Notification) => void
  markNotificationsRead: () => void

  connectToGroup: (groupId: string, childId: string) => void
  disconnectFromGroup: () => void

  fetchPendingApprovals: (storyId?: string) => Promise<void>
  requestApproval: (payload: {
    story_id: string
    page_id?: string
    diff_before: object
    diff_after: object
  }) => Promise<Approval | null>
  resolveApproval: (id: string, status: 'approved' | 'rejected', feedback?: string) => Promise<void>
}

export const useCollabStore = create<CollabStore>((set, get) => ({
  pendingApprovals: [],
  comments: [],
  notifications: [],
  channel: null,

  setPendingApprovals: (approvals) => set({ pendingApprovals: approvals }),
  setComments: (comments) => set({ comments }),

  addComment: (comment) =>
    set((state) => ({ comments: [...state.comments, comment] })),

  addNotification: (n) =>
    set((state) => ({ notifications: [n, ...state.notifications] })),

  markNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
    })),

  connectToGroup: (groupId, childId) => {
    const supabase = createClient()
    const existing = get().channel
    if (existing) supabase.removeChannel(existing)

    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'approvals', filter: `story_id=eq.${childId}` },
        (payload) => {
          const approval = payload.new as Approval
          if (approval.status === 'pending') {
            set((state) => ({
              pendingApprovals: [approval, ...state.pendingApprovals],
            }))
            get().addNotification({
              id: approval.id,
              type: 'approval_request',
              title: '수정 제안',
              body: '전문가가 수정 제안을 보냈어요',
              story_id: approval.story_id,
              is_read: false,
              created_at: approval.created_at,
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          get().addComment(payload.new as Comment)
        }
      )
      .subscribe()

    set({ channel })
  },

  disconnectFromGroup: () => {
    const supabase = createClient()
    const channel = get().channel
    if (channel) supabase.removeChannel(channel)
    set({ channel: null })
  },

  fetchPendingApprovals: async (storyId) => {
    const supabase = createClient()
    let query = supabase
      .from('approvals')
      .select('*, requester:user_profiles(id, full_name, role)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (storyId) query = query.eq('story_id', storyId)

    const { data } = await query
    if (data) set({ pendingApprovals: data as Approval[] })
  },

  requestApproval: async (payload) => {
    const res = await fetch('/api/approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    const { approval } = await res.json()
    return approval as Approval
  },

  resolveApproval: async (id, status, feedback) => {
    await fetch('/api/approval', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, feedback }),
    })
    set((state) => ({
      pendingApprovals: state.pendingApprovals.filter((a) => a.id !== id),
    }))
  },
}))
