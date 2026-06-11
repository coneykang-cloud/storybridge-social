'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useNotificationStore } from '@/stores/notification.store'
import type { Notification } from '@/types/app.types'

interface Props {
  userId: string
  initialNotifications: Notification[]
}

function notificationIcon(notification: Notification) {
  switch (notification.type) {
    case 'approval_request': return '🔔'
    case 'approval_result':  return notification.title.includes('승인') ? '✅' : '❌'
    case 'approval_sent':    return '📤'
    case 'comment':          return '💬'
    default:                 return '📌'
  }
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function NotificationsClient({ userId, initialNotifications }: Props) {
  const router = useRouter()
  const { notifications, unreadCount, setNotifications, markAsRead, markAllAsRead, connect, disconnect } = useNotificationStore()

  useEffect(() => {
    setNotifications(initialNotifications)
    connect(userId)
    return () => disconnect()
  }, [userId])

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) await markAsRead(notification.id)
    router.push(notification.story_id ? `/story/${notification.story_id}` : '/collab')
  }

  if (notifications.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-4xl mb-3">🔔</p>
        <p className="font-medium text-charcoal">아직 알림이 없어요</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
            모두 읽음으로 표시
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            hover
            padding="sm"
            onClick={() => handleClick(notification)}
            className={!notification.is_read ? 'border-mint-300 bg-mint-50/50' : undefined}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">{notificationIcon(notification)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-charcoal">{notification.title}</p>
                  {!notification.is_read && (
                    <span className="w-2 h-2 rounded-full bg-coral-500 shrink-0" />
                  )}
                </div>
                <p className="text-sm text-soft-gray mt-0.5">{notification.body}</p>
                <p className="text-xs text-soft-gray mt-1">{formatDateTime(notification.created_at)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
