// ============================================================
// useNotification - 通知模块 Hook
// ============================================================

import { useEffect } from 'react'
import { useNotificationStore } from '../store'

export function useNotification() {
  const {
    notifications,
    settings,
    unreadCount,
    sendNotification,
    scheduleNotification,
    cancelScheduled,
    cancelScheduledByRelatedId,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    requestPermission,
    updateSettings,
    refresh,
  } = useNotificationStore()

  // 组件挂载时刷新状态
  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    // 状态
    notifications,
    settings,
    unreadCount,
    hasPermission: settings.browserPermission === 'granted',
    permissionDenied: settings.browserPermission === 'denied',

    // 操作
    sendNotification,
    scheduleNotification,
    cancelScheduled,
    cancelScheduledByRelatedId,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    requestPermission,
    updateSettings,
    refresh,

    // 便捷方法
    sendTodoReminder: (title: string, body: string, todoId?: string) =>
      sendNotification({
        type: 'todo',
        title,
        body,
        priority: 'normal',
        relatedId: todoId,
      }),

    sendScheduleReminder: (title: string, body: string, scheduleId?: string) =>
      sendNotification({
        type: 'schedule',
        title,
        body,
        priority: 'high',
        relatedId: scheduleId,
      }),

    sendSystemNotification: (title: string, body: string) =>
      sendNotification({
        type: 'system',
        title,
        body,
        priority: 'normal',
      }),
  }
}
