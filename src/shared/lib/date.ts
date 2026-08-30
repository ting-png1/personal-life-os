// ============================================================
// Date Utilities (基于 date-fns 封装)
// 所有日期格式统一使用 ISO 字符串
// ============================================================

import { format, parseISO, isSameDay, isToday, getDay, startOfDay, addDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 重新导出 date-fns 常用函数，方便统一引用
export { format, addDays }

/** 当前时间的 ISO 字符串 */
export function nowISO(): string {
  return new Date().toISOString()
}

/** 今天的日期字符串 "YYYY-MM-DD" */
export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** 从 ISO 字符串提取日期部分 "YYYY-MM-DD" */
export function toDateStr(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd')
}

/** 格式化为 "HH:mm" */
export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

/** 格式化为 "MM/dd" */
export function formatMonthDay(isoOrDateStr: string): string {
  const date = isoOrDateStr.includes('T') ? parseISO(isoOrDateStr) : parseISO(isoOrDateStr + 'T00:00:00')
  return format(date, 'MM/dd')
}

/** 获取星期几的中文名称 */
export function getWeekdayCN(dateStr: string): string {
  const date = parseISO(dateStr + 'T00:00:00')
  return format(date, 'EEEE', { locale: zhCN })
}

/** 获取星期几的英文名称 */
export function getWeekdayEN(dateStr: string): string {
  const date = parseISO(dateStr + 'T00:00:00')
  return format(date, 'EEEE')
}

/** 判断 ISO 时间是否为今天 */
export function isTodayISO(iso: string): boolean {
  return isToday(parseISO(iso))
}

/** 判断两个 ISO 字符串是否为同一天 */
export function isSameDayISO(iso1: string, iso2: string): boolean {
  return isSameDay(parseISO(iso1), parseISO(iso2))
}

/** 获取日期是星期几 (0=周日, 1=周一, ..., 6=周六) */
export function getDayOfWeek(dateStr: string): number {
  return getDay(parseISO(dateStr + 'T00:00:00'))
}

/** 根据当前时间返回问候语 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Good night.'
  if (hour < 12) return 'Good morning.'
  if (hour < 14) return 'Good noon.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

/** 获取一天的开始时间 ISO */
export function startOfDayISO(dateStr: string): string {
  return startOfDay(parseISO(dateStr + 'T00:00:00')).toISOString()
}

/** 用于 datetime-local input 的值格式 "YYYY-MM-DDTHH:mm" */
export function toDateTimeLocalValue(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm")
}

/** 从 datetime-local input 值转为 ISO 字符串 */
export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString()
}
