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
 * 支持：每周重复 + 星期几 + 周范围 + 单双周 + 排除日期 + 特定日期覆盖。
 *
 * 字段说明：
 * - freq: 重复频率，目前仅支持 'weekly'
 * - daysOfWeek: 重复的星期几（0=周日, 1=周一, ..., 6=周六）
 * - startDate: 重复开始日期 "YYYY-MM-DD"
 * - endDate: 重复结束日期 "YYYY-MM-DD"
 * - weekParity: 单双周限制（可选）。'all'=每周（默认），'odd'=单周，'even'=双周。
 *   周数计算：以 startDate 所在的周一为第1周的开始，向后推算。
 * - weekRange: 周数范围（可选）[起始周, 结束周]。课程只在这个周数范围内有效。
 *   与 weekParity 可组合使用（如第3-16周的单周上课）。
 * - excludedDates: 排除的日期列表 "YYYY-MM-DD"（如放假、调课休课）。
 * - overrides: 特定日期的覆盖（如调课到其他时间/地点，或临时取消）。
 */
export interface RecurrenceRule {
  freq: 'weekly'
  daysOfWeek: number[] // 0=周日, 1=周一, ..., 6=周六
  startDate: string // "YYYY-MM-DD"
  endDate: string // "YYYY-MM-DD"
  weekParity?: 'all' | 'odd' | 'even' // 单双周，默认 'all'
  weekRange?: [number, number] // 周数范围 [起始周, 结束周]
  excludedDates?: string[] // 排除的日期 "YYYY-MM-DD"
  overrides?: Record<string, ScheduleOverride> // 特定日期的覆盖
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
