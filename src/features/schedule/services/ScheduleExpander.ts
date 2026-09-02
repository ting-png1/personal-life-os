// ============================================================
// ScheduleExpander — 纯函数
// 将带 recurrence 的 ScheduleEvent 展开为指定日期的实例
// 不依赖 React / DOM / Dexie，可单测可移植
//
// 支持的重复规则：
// - freq=weekly + daysOfWeek + startDate/endDate（基础）
// - weekParity: 单双周限制（all/odd/even）
// - weekRange: 周数范围 [起始周, 结束周]
// - excludedDates: 排除的日期列表（放假/调课休课）
// - overrides: 特定日期的覆盖（调课到其他时间/地点，或临时取消）
// ============================================================

import type { ScheduleEvent, ScheduleInstance } from '../types.ts'
import { getDayOfWeek, moveInstantToLocalDate, toDateStr } from '../../../shared/lib/date.ts'

interface ExpansionOptions {
  /** 日程管理页需要显示已取消实例，Today 等消费方默认隐藏 */
  includeCancelled?: boolean
}

/**
 * 计算某日期相对于 startDate 的周数。
 * 以 startDate 所在的周一为第 1 周的开始，向后推算。
 *
 * 例如：startDate = 2026-09-01（周二），则 2026-08-31（周一）为第1周开始。
 * 2026-09-01 ~ 2026-09-06 为第1周，2026-09-07 ~ 2026-09-13 为第2周。
 *
 * @param dateStr 目标日期 "YYYY-MM-DD"
 * @param startDateStr 重复开始日期 "YYYY-MM-DD"
 * @returns 周数（从1开始）；如果 date 在 startDate 之前，返回 0 或负数
 */
export function getWeekNumber(dateStr: string, startDateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00')
  const start = new Date(startDateStr + 'T00:00:00')

  // 找到 startDate 所在周的周一
  const startDayOfWeek = start.getDay() // 0=周日, 1=周一, ...
  const mondayOffset = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek
  const week1Monday = new Date(start)
  week1Monday.setDate(start.getDate() + mondayOffset)

  // 计算天数差，除以7取整 + 1
  const diffMs = date.getTime() - week1Monday.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.floor(diffDays / 7) + 1
}

/**
 * 判断一个重复事件在指定日期是否有实例
 * 完整支持 weekParity / weekRange / excludedDates / overrides
 */
export function isEventOnDate(
  event: ScheduleEvent,
  date: string,
  options: ExpansionOptions = {}
): boolean {
  // 一次性事件：判断 startDateTime 的日期是否匹配
  if (!event.recurrence) {
    return toDateStr(event.startDateTime) === date
  }

  const rule = event.recurrence

  // 1. 日期范围检查
  if (date < rule.startDate || date > rule.endDate) {
    return false
  }

  // 2. 星期几检查
  const dayOfWeek = getDayOfWeek(date)
  if (!rule.daysOfWeek.includes(dayOfWeek)) {
    return false
  }

  // 3. 周数范围检查（weekRange）
  if (rule.weekRange) {
    const weekNum = getWeekNumber(date, rule.startDate)
    const [startWeek, endWeek] = rule.weekRange
    if (weekNum < startWeek || weekNum > endWeek) {
      return false
    }
  }

  // 4. 单双周检查（weekParity）
  if (rule.weekParity && rule.weekParity !== 'all') {
    const weekNum = getWeekNumber(date, rule.startDate)
    const isOdd = weekNum % 2 === 1
    if (rule.weekParity === 'odd' && !isOdd) return false
    if (rule.weekParity === 'even' && isOdd) return false
  }

  // 5. 排除日期检查（excludedDates）
  if (rule.excludedDates && rule.excludedDates.includes(date)) {
    return false
  }

  // 6. 特定日期覆盖检查（overrides）
  if (rule.overrides && rule.overrides[date]) {
    const override = rule.overrides[date]
    // 如果标记为取消，则不显示
    if (override.cancelled && !options.includeCancelled) {
      return false
    }
  }

  return true
}

/**
 * 将事件展开为指定日期的实例
 * 如果该日期没有实例，返回 null
 * 应用 overrides 中的时间/地点覆盖
 */
export function expandForDate(
  event: ScheduleEvent,
  date: string,
  options: ExpansionOptions = {}
): ScheduleInstance | null {
  if (!isEventOnDate(event, date, options)) {
    return null
  }

  // 对于重复事件，用日期替换 startDateTime/endDateTime 的日期部分，保留时间
  if (event.recurrence) {
    let startDateTime = moveInstantToLocalDate(event.startDateTime, date)
    let endDateTime = moveInstantToLocalDate(event.endDateTime, date)
    let location = event.location

    // 应用 overrides（特定日期的时间/地点覆盖）
    const override = event.recurrence.overrides?.[date]
    if (override) {
      if (override.startDateTime) {
        startDateTime = moveInstantToLocalDate(override.startDateTime, date)
      }
      if (override.endDateTime) {
        endDateTime = moveInstantToLocalDate(override.endDateTime, date)
      }
      if (override.location !== undefined) {
        location = override.location
      }
    }

    return {
      eventId: event.id,
      title: event.title,
      type: event.type,
      location,
      startDateTime,
      endDateTime,
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
export function expandEventsForDate(
  events: ScheduleEvent[],
  date: string,
  options: ExpansionOptions = {}
): ScheduleInstance[] {
  return events
    .map((event) => expandForDate(event, date, options))
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
