// ============================================================
// NotificationCenter - 通知中心组件
// 显示通知列表、未读标记、已读/清除操作
// ============================================================

import { useState } from 'react'
import { useNotification } from '@/features/notification/hooks/useNotification'
import { Modal } from '@/shared/ui/Modal'
import { Bell, CheckCheck, Trash2, Clock, Calendar, ListTodo, Info } from 'lucide-react'
import type { AppNotification, NotificationType } from '@/features/notification/types'

interface NotificationCenterProps {
  open: boolean
  onClose: () => void
}

/** 根据通知类型获取图标 */
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'todo':
      return <ListTodo className="w-4 h-4 text-primary-500" />
    case 'schedule':
      return <Calendar className="w-4 h-4 text-success-500" />
    case 'system':
      return <Info className="w-4 h-4 text-text-secondary" />
    case 'reminder':
      return <Clock className="w-4 h-4 text-warning-500" />
    default:
      return <Bell className="w-4 h-4 text-text-secondary" />
  }
}

/** 格式化时间 */
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotification()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n: AppNotification) => n.status === 'sent')
    : notifications

  const handleNotificationClick = (notification: AppNotification) => {
    if (notification.status === 'sent') {
      markAsRead(notification.id)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="通知中心">
      <div className="space-y-4">
        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-100 text-primary-600'
                  : 'text-text-secondary hover:bg-surface'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-primary-100 text-primary-600'
                  : 'text-text-secondary hover:bg-surface'
              }`}
            >
              未读 {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-1.5 rounded-lg text-text-secondary hover:bg-surface hover:text-primary-500 transition-colors"
                title="全部已读"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="p-1.5 rounded-lg text-text-secondary hover:bg-surface hover:text-error-500 transition-colors"
                title="清除全部"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 通知列表 */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
                <Bell className="w-8 h-8 text-text-tertiary" />
              </div>
              <p className="text-sm text-text-secondary">
                {filter === 'unread' ? '没有未读通知' : '暂无通知'}
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                待办到期、课程开始时会在这里提醒你
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification: AppNotification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  notification.status === 'sent'
                    ? 'bg-primary-50/60 border border-primary-100'
                    : 'bg-surface/50 border border-transparent hover:bg-surface'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${
                        notification.status === 'sent' ? 'text-text-primary' : 'text-text-secondary'
                      }`}>
                        {notification.title}
                      </p>
                      <span className="text-xs text-text-tertiary flex-shrink-0">
                        {formatTime(notification.sentAt || notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                      {notification.body}
                    </p>
                  </div>
                  {notification.status === 'sent' && (
                    <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearNotification(notification.id)
                    }}
                    className="text-xs text-text-tertiary hover:text-error-500 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
