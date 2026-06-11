import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Approval, Comment } from '@/types/app.types'

interface CollabStore {
  pendingApprovals: Approval[]
  approvalHistory: Approval[]
  comments: Comment[]
  channel: RealtimeChannel | null

  setPendingApprovals: (approvals: Approval[]) => void
  setApprovalHistory: (approvals: Approval[]) => void
  setComments: (comments: Comment[]) => void
  addComment: (comment: Comment) => void

  connectToGroup: (groupId: string, storyIds: string[]) => void
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
  approvalHistory: [],
  comments: [],
  notifications: [],
  channel: null,

  setPendingApprovals: (approvals) => set({ pendingApprovals: approvals }),
  setApprovalHistory: (approvals) => set({ approvalHistory: approvals }),
  setComments: (comments) => set({ comments }),

  addComment: (comment) =>
    set((state) => ({ comments: [...state.comments, comment] })),

  connectToGroup: (groupId, storyIds) => {
    const supabase = createClient()
    const existing = get().channel
    if (existing) supabase.removeChannel(existing)

    let channel = supabase.channel(`group:${groupId}`)

    if (storyIds.length > 0) {
      channel = channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'approvals', filter: `story_id=in.(${storyIds.join(',')})` },
        (payload) => {
          const approval = payload.new as Approval
          if (approval.status === 'pending') {
            set((state) => ({
              pendingApprovals: [approval, ...state.pendingApprovals],
            }))
          }
        }
      )
    }

    channel = channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'comments' },
      (payload) => {
        get().addComment(payload.new as Comment)
      }
    )

    channel.subscribe()
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
    const res = await fetch('/api/approval', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, feedback }),
    })
    const updated = res.ok ? ((await res.json()).approval as Approval) : null

    set((state) => {
      const target = state.pendingApprovals.find((a) => a.id === id)
      return {
        pendingApprovals: state.pendingApprovals.filter((a) => a.id !== id),
        approvalHistory: target
          ? [{ ...target, ...updated }, ...state.approvalHistory]
          : state.approvalHistory,
      }
    })
  },
}))
