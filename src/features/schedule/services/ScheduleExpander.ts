// ============================================================
// ScheduleExpander — 纯函数
// 将带 recurrence 的 ScheduleEvent 展开为指定日期的实例
// 不依赖 React / DOM / Dexie，可单测可移植
// ============================================================

import type { ScheduleEvent, ScheduleInstance } from '../types'
import { getDayOfWeek } from '@/shared/lib/date'

/**
 * 判断一个重复事件在指定日期是否有实例
 * MVP 只处理 freq=weekly + daysOfWeek + startDate/endDate
 * 预留字段 weekRange/excludedDates/overrides 暂不处理
 */
export function isEventOnDate(event: ScheduleEvent, date: string): boolean {
  // 一次性事件：判断 startDateTime 的日期是否匹配
  if (!event.recurrence) {
    return event.startDateTime.startsWith(date)
  }

  const rule = event.recurrence

  // 日期范围检查
  if (date < rule.startDate || date > rule.endDate) {
    return false
  }

  // 星期几检查
  const dayOfWeek = getDayOfWeek(date)
  if (!rule.daysOfWeek.includes(dayOfWeek)) {
    return false
  }

  // MVP 暂不处理 weekRange / excludedDates / overrides
  // 未来实现时在此处添加检查

  return true
}

/**
 * 将事件展开为指定日期的实例
 * 如果该日期没有实例，返回 null
 */
export function expandForDate(event: ScheduleEvent, date: string): ScheduleInstance | null {
  if (!isEventOnDate(event, date)) {
    return null
  }

  // 对于重复事件，用日期替换 startDateTime/endDateTime 的日期部分，保留时间
  if (event.recurrence) {
    const startTime = event.startDateTime.split('T')[1] || '00:00:00'
    const endTime = event.endDateTime.split('T')[1] || '00:00:00'
    return {
      eventId: event.id,
      title: event.title,
      type: event.type,
      location: event.location,
      startDateTime: `${date}T${startTime}`,
      endDateTime: `${date}T${endTime}`,
    }
  }

  // 一次性事件直接返回
  return {
    eventId: event.id,
    title: event.title,
    type: event.type,
    location: event.location,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
  }
}

/**
 * 将所有事件展开为指定日期的实例列表，按开始时间排序
 */
export function expandEventsForDate(events: ScheduleEvent[], date: string): ScheduleInstance[] {
  return events
    .map((event) => expandForDate(event, date))
    .filter((instance): instance is ScheduleInstance => instance !== null)
    .sort(
      (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    )
}

/**
 * 获取当前正在进行的实例
 */
export function getCurrentInstance(instances: ScheduleInstance[], now: Date = new Date()): ScheduleInstance | null {
  return instances.find(
    (instance) =>
      new Date(instance.startDateTime) <= now && new Date(instance.endDateTime) > now
  ) || null
}

/**
 * 获取下一个即将开始的实例
 */
export function getNextInstance(instances: ScheduleInstance[], now: Date = new Date()): ScheduleInstance | null {
  const upcoming = instances.filter((instance) => new Date(instance.startDateTime) > now)
  return upcoming.length > 0 ? upcoming[0] : null
}
