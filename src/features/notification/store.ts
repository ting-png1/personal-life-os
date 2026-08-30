// ============================================================
// Notification Store - 通知状态管理
// ============================================================

import { create } from 'zustand'
import { notificationService } from './NotificationService'
import type { AppNotification, NotificationSettings, NotificationType, NotificationPriority } from './types'

interface NotificationStore {
  // 状态
  notifications: AppNotification[]
  settings: NotificationSettings
  unreadCount: number

  // 操作
  sendNotification: (params: {
    type: NotificationType
    title: string
    body: string
    priority?: NotificationPriority
    relatedId?: string
  }) => Promise<AppNotification>

  scheduleNotification: (params: {
    type: NotificationType
    title: string
    body: string
    triggerAt: number
    priority?: NotificationPriority
    relatedId?: string
  }) => string

  cancelScheduled: (taskId: string) => void
  cancelScheduledByRelatedId: (relatedId: string) => void

  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void

  requestPermission: () => Promise<NotificationPermission>
  updateSettings: (patch: Partial<NotificationSettings>) => NotificationSettings

  refresh: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => {
  // 初始化时订阅通知变化
  let subscribed = false

  const ensureSubscribed = () => {
    if (subscribed) return
    subscribed = true
    notificationService.subscribe((notifications) => {
      set({
        notifications,
        unreadCount: notifications.filter((n) => n.status === 'sent').length,
      })
    })
  }

  return {
    notifications: notificationService.getNotifications(),
    settings: notificationService.getSettings(),
    unreadCount: notificationService.getUnreadCount(),

    sendNotification: async (params) => {
      ensureSubscribed()
      return notificationService.sendNotification(params)
    },

    scheduleNotification: (params) => {
      ensureSubscribed()
      return notificationService.scheduleNotification(params)
    },

    cancelScheduled: (taskId) => {
      notificationService.cancelScheduledNotification(taskId)
    },

    cancelScheduledByRelatedId: (relatedId) => {
      notificationService.cancelScheduledByRelatedId(relatedId)
    },

    markAsRead: (id) => {
      notificationService.markAsRead(id)
    },

    markAllAsRead: () => {
      notificationService.markAllAsRead()
    },

    clearNotification: (id) => {
      notificationService.clearNotification(id)
    },

    clearAll: () => {
      notificationService.clearAll()
    },

    requestPermission: async () => {
      const permission = await notificationService.requestPermission()
      set({ settings: notificationService.getSettings() })
      return permission
    },

    updateSettings: (patch) => {
      const settings = notificationService.updateSettings(patch)
      set({ settings })
      return settings
    },

    refresh: () => {
      ensureSubscribed()
      set({
        notifications: notificationService.getNotifications(),
        unreadCount: notificationService.getUnreadCount(),
        settings: notificationService.getSettings(),
      })
    },
  }
})
