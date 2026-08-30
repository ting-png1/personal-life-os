// ============================================================
// Notification Types - 通知模块类型定义
// ============================================================

/** 通知类型 */
export type NotificationType = 'todo' | 'schedule' | 'system' | 'reminder'

/** 通知优先级 */
export type NotificationPriority = 'low' | 'normal' | 'high'

/** 通知状态 */
export type NotificationStatus = 'pending' | 'sent' | 'read' | 'dismissed'

/** 通知项（App 内提醒中心） */
export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  priority: NotificationPriority
  status: NotificationStatus
  /** 关联的业务数据 ID（如 todoId、scheduleId） */
  relatedId?: string
  /** 计划发送时间（ISO 字符串） */
  scheduledAt: string
  /** 实际发送时间（ISO 字符串） */
  sentAt?: string
  /** 创建时间（ISO 字符串） */
  createdAt: string
}

/** 通知设置 */
export interface NotificationSettings {
  /** 全局开关 */
  enabled: boolean
  /** 浏览器通知权限 */
  browserPermission: NotificationPermission | 'default'
  /** Todo 截止提醒 */
  todoReminders: {
    enabled: boolean
    /** 提前提醒时间（分钟） */
    remindBefore: number
  }
  /** 课程开始提醒 */
  scheduleReminders: {
    enabled: boolean
    /** 提前提醒时间（分钟） */
    remindBefore: number
  }
  /** 每日总结提醒 */
  dailySummary: {
    enabled: boolean
    /** 提醒时间（HH:mm 格式） */
    time: string
  }
  /** 声音提醒 */
  soundEnabled: boolean
  /** 振动提醒（移动端） */
  vibrateEnabled: boolean
}

/** 待调度的通知任务 */
export interface ScheduledNotification {
  id: string
  notification: AppNotification
  /** 触发时间戳（毫秒） */
  triggerAt: number
  /** 定时器 ID */
  timerId?: ReturnType<typeof setTimeout>
}

/** 通知发送结果 */
export interface NotificationResult {
  success: boolean
  notificationId: string
  error?: string
}
