import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Notification } from '@/types/app.types'

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  channel: RealtimeChannel | null

  setNotifications: (notifications: Notification[]) => void
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>

  connect: (userId: string) => void
  disconnect: () => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  channel: null,

  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter((n) => !n.is_read).length }),

  fetchNotifications: async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      const notifications = data as Notification[]
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.is_read).length,
      })
    }
  },

  markAsRead: async (id) => {
    const supabase = createClient()
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - (state.notifications.find((n) => n.id === id)?.is_read ? 0 : 1)),
    }))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  },

  markAllAsRead: async () => {
    const supabase = createClient()
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
  },

  connect: (userId) => {
    const supabase = createClient()
    const existing = get().channel
    if (existing) supabase.removeChannel(existing)

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const notification = payload.new as Notification
          set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }))
        }
      )
      .subscribe()

    set({ channel })
  },

  disconnect: () => {
    const supabase = createClient()
    const channel = get().channel
    if (channel) supabase.removeChannel(channel)
    set({ channel: null })
  },
}))
