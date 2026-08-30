// ============================================================
// NotificationService - 通知服务
// 封装浏览器 Notification API + 通知调度逻辑
// ============================================================

import { generateId } from '@/shared/lib/id'
import { nowISO } from '@/shared/lib/date'
import type {
  AppNotification,
  NotificationSettings,
  ScheduledNotification,
  NotificationType,
  NotificationPriority,
} from './types'

// 默认通知设置
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  browserPermission: 'default',
  todoReminders: {
    enabled: true,
    remindBefore: 15, // 提前 15 分钟提醒
  },
  scheduleReminders: {
    enabled: true,
    remindBefore: 10, // 提前 10 分钟提醒
  },
  dailySummary: {
    enabled: false,
    time: '21:00',
  },
  soundEnabled: true,
  vibrateEnabled: true,
}

// localStorage key
const SETTINGS_STORAGE_KEY = 'lifeos_notification_settings'
const NOTIFICATIONS_STORAGE_KEY = 'lifeos_notifications'

class NotificationService {
  private settings: NotificationSettings
  private notifications: AppNotification[] = []
  private scheduledTasks: Map<string, ScheduledNotification> = new Map()
  private listeners: Array<(notifications: AppNotification[]) => void> = []

  constructor() {
    this.settings = this.loadSettings()
    this.notifications = this.loadNotifications()
    this.checkBrowserPermission()
  }

  // ============================================================
  // 设置管理
  // ============================================================

  private loadSettings(): NotificationSettings {
    try {
      if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('[NotificationService] 加载设置失败:', error)
    }
    return DEFAULT_SETTINGS
  }

  private saveSettings(): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings))
    } catch (error) {
      console.error('[NotificationService] 保存设置失败:', error)
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings }
  }

  updateSettings(patch: Partial<NotificationSettings>): NotificationSettings {
    this.settings = { ...this.settings, ...patch }
    this.saveSettings()
    return { ...this.settings }
  }

  // ============================================================
  // 浏览器通知权限
  // ============================================================

  private checkBrowserPermission(): void {
    if (typeof Notification !== 'undefined') {
      this.settings.browserPermission = Notification.permission
    }
  }

  /** 请求浏览器通知权限 */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') {
      return 'denied'
    }
    if (Notification.permission === 'granted') {
      this.settings.browserPermission = 'granted'
      return 'granted'
    }
    try {
      const permission = await Notification.requestPermission()
      this.settings.browserPermission = permission
      this.saveSettings()
      return permission
    } catch (error) {
      console.error('[NotificationService] 请求权限失败:', error)
      return 'denied'
    }
  }

  /** 检查是否可以发送浏览器通知 */
  canSendBrowserNotification(): boolean {
    return (
      this.settings.enabled &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    )
  }

  // ============================================================
  // 通知存储
  // ============================================================

  private loadNotifications(): AppNotification[] {
    try {
      if (typeof localStorage === 'undefined') return []
      const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved) as AppNotification[]
      }
    } catch (error) {
      console.error('[NotificationService] 加载通知失败:', error)
    }
    return []
  }

  private saveNotifications(): void {
    try {
      if (typeof localStorage === 'undefined') return
      // 只保留最近 100 条通知
      const toSave = this.notifications.slice(0, 100)
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(toSave))
    } catch (error) {
      console.error('[NotificationService] 保存通知失败:', error)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.notifications])
      } catch (error) {
        console.error('[NotificationService] 监听器错误:', error)
      }
    })
  }

  /** 订阅通知变化 */
  subscribe(listener: (notifications: AppNotification[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /** 获取所有通知 */
  getNotifications(): AppNotification[] {
    return [...this.notifications]
  }

  /** 获取未读通知数量 */
  getUnreadCount(): number {
    return this.notifications.filter((n) => n.status === 'sent').length
  }

  /** 标记通知为已读 */
  markAsRead(id: string): void {
    const notification = this.notifications.find((n) => n.id === id)
    if (notification) {
      notification.status = 'read'
      this.saveNotifications()
      this.notifyListeners()
    }
  }

  /** 标记所有通知为已读 */
  markAllAsRead(): void {
    this.notifications.forEach((n) => {
      if (n.status === 'sent') n.status = 'read'
    })
    this.saveNotifications()
    this.notifyListeners()
  }

  /** 清除通知 */
  clearNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id)
    this.saveNotifications()
    this.notifyListeners()
  }

  /** 清除所有通知 */
  clearAll(): void {
    this.notifications = []
    this.saveNotifications()
    this.notifyListeners()
  }

  // ============================================================
  // 发送通知
  // ============================================================

  /**
   * 创建并发送通知
   */
  async sendNotification(params: {
    type: NotificationType
    title: string
    body: string
    priority?: NotificationPriority
    relatedId?: string
  }): Promise<AppNotification> {
    const notification: AppNotification = {
      id: generateId(),
      type: params.type,
      title: params.title,
      body: params.body,
      priority: params.priority ?? 'normal',
      status: 'sent',
      relatedId: params.relatedId,
      scheduledAt: nowISO(),
      sentAt: nowISO(),
      createdAt: nowISO(),
    }

    // 添加到通知列表（最前面）
    this.notifications.unshift(notification)
    this.saveNotifications()
    this.notifyListeners()

    // 发送浏览器通知
    if (this.canSendBrowserNotification()) {
      try {
        const browserNotification = new Notification(params.title, {
          body: params.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: notification.id,
          requireInteraction: params.priority === 'high',
          silent: !this.settings.soundEnabled,
        })

        // 点击通知时聚焦窗口
        browserNotification.onclick = () => {
          window.focus()
          browserNotification.close()
        }

        // 移动端振动
        if (this.settings.vibrateEnabled && 'vibrate' in navigator) {
          navigator.vibrate(params.priority === 'high' ? [200, 100, 200] : [100])
        }
      } catch (error) {
        console.error('[NotificationService] 发送浏览器通知失败:', error)
      }
    }

    return notification
  }

  // ============================================================
  // 定时通知调度
  // ============================================================

  /**
   * 调度一个定时通知
   */
  scheduleNotification(params: {
    type: NotificationType
    title: string
    body: string
    triggerAt: number // 触发时间戳（毫秒）
    priority?: NotificationPriority
    relatedId?: string
  }): string {
    const taskId = generateId()
    const now = Date.now()
    const delay = params.triggerAt - now

    // 如果时间已过，立即发送
    if (delay <= 0) {
      this.sendNotification({
        type: params.type,
        title: params.title,
        body: params.body,
        priority: params.priority,
        relatedId: params.relatedId,
      })
      return taskId
    }

    // 创建待发送通知
    const pendingNotification: AppNotification = {
      id: generateId(),
      type: params.type,
      title: params.title,
      body: params.body,
      priority: params.priority ?? 'normal',
      status: 'pending',
      relatedId: params.relatedId,
      scheduledAt: new Date(params.triggerAt).toISOString(),
      createdAt: nowISO(),
    }

    // 设置定时器
    const timerId = setTimeout(async () => {
      // 更新通知状态
      pendingNotification.status = 'sent'
      pendingNotification.sentAt = nowISO()
      this.notifications.unshift(pendingNotification)
      this.saveNotifications()
      this.notifyListeners()

      // 发送浏览器通知
      if (this.canSendBrowserNotification()) {
        try {
          new Notification(params.title, {
            body: params.body,
            icon: '/icon-192.png',
            tag: pendingNotification.id,
            requireInteraction: params.priority === 'high',
            silent: !this.settings.soundEnabled,
          })
        } catch (error) {
          console.error('[NotificationService] 定时通知发送失败:', error)
        }
      }

      // 清除已完成的任务
      this.scheduledTasks.delete(taskId)
    }, delay)

    // 保存定时任务
    this.scheduledTasks.set(taskId, {
      id: taskId,
      notification: pendingNotification,
      triggerAt: params.triggerAt,
      timerId,
    })

    return taskId
  }

  /** 取消定时通知 */
  cancelScheduledNotification(taskId: string): void {
    const task = this.scheduledTasks.get(taskId)
    if (task && task.timerId) {
      clearTimeout(task.timerId)
      this.scheduledTasks.delete(taskId)
    }
  }

  /** 取消所有关联的定时通知 */
  cancelScheduledByRelatedId(relatedId: string): void {
    this.scheduledTasks.forEach((task, taskId) => {
      if (task.notification.relatedId === relatedId) {
        if (task.timerId) clearTimeout(task.timerId)
        this.scheduledTasks.delete(taskId)
      }
    })
  }

  /** 获取所有待发送的定时任务 */
  getScheduledTasks(): ScheduledNotification[] {
    return Array.from(this.scheduledTasks.values())
  }

  /** 清除所有定时任务 */
  clearAllScheduled(): void {
    this.scheduledTasks.forEach((task) => {
      if (task.timerId) clearTimeout(task.timerId)
    })
    this.scheduledTasks.clear()
  }
}

export const notificationService = new NotificationService()
