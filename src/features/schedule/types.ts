// ============================================================
// Schedule Domain Types
// ============================================================

export type ScheduleEventType = 'class' | 'personal' | 'rest' | 'other'

export interface ScheduleEvent {
  id: string
  title: string
  type: ScheduleEventType
  location: string | null
  note: string | null
  startDateTime: string // ISO "2026-08-30T09:00:00"
  endDateTime: string // ISO "2026-08-30T10:40:00"
  recurrence: RecurrenceRule | null // 仅 class 通常有值
  createdAt: string
  updatedAt: string
}

/**
 * 重复规则。
 * MVP 只实现 freq + daysOfWeek + startDate + endDate。
 * weekRange / excludedDates / overrides 为预留扩展字段，
 * 用于大学课程的单双周、调课、临时取消等场景。
 * MVP 的 TodayAggregator 暂不处理这些字段。
 */
export interface RecurrenceRule {
  freq: 'weekly'
  daysOfWeek: number[] // 0=周日, 1=周一, ..., 6=周六
  startDate: string // "YYYY-MM-DD"
  endDate: string // "YYYY-MM-DD"
  weekRange?: [number, number] // 预留：[起始周, 结束周]
  excludedDates?: string[] // 预留：排除的日期 "YYYY-MM-DD"
  overrides?: Record<string, ScheduleOverride> // 预留：特定日期的覆盖
}

export interface ScheduleOverride {
  startDateTime?: string
  endDateTime?: string
  location?: string
  cancelled?: boolean
}

/** 从 ScheduleEvent 展开后的单日实例 */
export interface ScheduleInstance {
  eventId: string
  title: string
  type: ScheduleEventType
  location: string | null
  startDateTime: string
  endDateTime: string
}

export interface CreateScheduleInput {
  title: string
  type: ScheduleEventType
  startDateTime: string
  endDateTime: string
  location?: string | null
  note?: string | null
  recurrence?: RecurrenceRule | null
}

export type UpdateScheduleInput = Partial<
  Pick<ScheduleEvent, 'title' | 'type' | 'location' | 'note' | 'startDateTime' | 'endDateTime' | 'recurrence'>
>
