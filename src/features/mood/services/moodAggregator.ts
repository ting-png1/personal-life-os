// ============================================================
// Mood Aggregator — 纯函数
// 情绪数据的聚合、统计、分类工具
// 不依赖 React / DOM / Dexie，可单测可移植
// ============================================================
//
// 设计原则：
// 1. Deterministic First：所有计算为确定性程序逻辑，不调用 AI
// 2. 可解释：每个函数的计算规则明确、可理解、可测试
// 3. 不写死无依据的产品假设：例如"晚间权重更高""至少2条算数据充足"
//    等规则属于产品语义决策，需要用户确认后再实现
// 4. 简单平均是最稳健的基线：不引入任意权重，结果可解释
// ============================================================

import type { MoodRecord, MoodLevel } from '../types'

/** 时段分类 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

/**
 * 根据小时判断时段
 * 通用划分（符合大多数人作息，未来可根据产品需求调整）：
 * - morning:   05:00 - 11:59
 * - afternoon: 12:00 - 17:59
 * - evening:   18:00 - 21:59
 * - night:     22:00 - 04:59
 */
export function getTimeOfDay(createdAt: string): TimeOfDay {
  const hour = new Date(createdAt).getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

/** 时段中文标签 */
export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: '早晨',
  afternoon: '下午',
  evening: '晚上',
  night: '深夜',
}

/**
 * 获取指定日期的所有情绪记录
 */
export function getMoodsByDate(records: MoodRecord[], date: string): MoodRecord[] {
  return records.filter((r) => r.date === date)
}

/**
 * 获取指定日期的情绪记录，按时间排序
 * @param order 'asc' = 时间升序（最早在前，时间线）；'desc' = 时间降序（最新在前）
 */
export function getMoodsByDateSorted(
  records: MoodRecord[],
  date: string,
  order: 'asc' | 'desc' = 'desc'
): MoodRecord[] {
  const dayRecords = getMoodsByDate(records, date)
  return dayRecords.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime()
    const timeB = new Date(b.createdAt).getTime()
    return order === 'asc' ? timeA - timeB : timeB - timeA
  })
}

/**
 * 获取指定日期的情绪记录数量
 */
export function getMoodCountByDate(records: MoodRecord[], date: string): number {
  return getMoodsByDate(records, date).length
}

/**
 * 判断指定日期是否已记录情绪
 */
export function hasMoodOnDate(records: MoodRecord[], date: string): boolean {
  return getMoodCountByDate(records, date) > 0
}

/**
 * 获取指定日期最新的一条情绪记录
 */
export function getLatestMoodByDate(records: MoodRecord[], date: string): MoodRecord | null {
  const sorted = getMoodsByDateSorted(records, date, 'desc')
  return sorted.length > 0 ? sorted[0] : null
}

/**
 * 按时段分组指定日期的情绪记录
 * 返回 { morning: [...], afternoon: [...], evening: [...], night: [...] }
 */
export function getMoodsByTimeOfDay(
  records: MoodRecord[],
  date: string
): Record<TimeOfDay, MoodRecord[]> {
  const dayRecords = getMoodsByDate(records, date)
  const grouped: Record<TimeOfDay, MoodRecord[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  }
  dayRecords.forEach((record) => {
    const tod = getTimeOfDay(record.createdAt)
    grouped[tod].push(record)
  })
  return grouped
}

/**
 * 简单平均情绪等级
 * 最稳健的基线计算：所有记录的 level 算术平均
 * 不引入任何权重假设，结果可解释
 * @returns 0 表示无数据；否则为 1-5 的平均值（可能为小数）
 */
export function getSimpleAverageMood(records: MoodRecord[], date: string): number {
  const dayRecords = getMoodsByDate(records, date)
  if (dayRecords.length === 0) return 0
  const sum = dayRecords.reduce((acc, r) => acc + r.level, 0)
  return sum / dayRecords.length
}

/**
 * 情绪波动范围（极差）
 * 当天最高情绪等级 - 最低情绪等级
 * @returns 0 表示无数据或只有一条；否则为 0-4 的整数
 */
export function getMoodRange(records: MoodRecord[], date: string): number {
  const dayRecords = getMoodsByDate(records, date)
  if (dayRecords.length <= 1) return 0
  const levels = dayRecords.map((r) => r.level)
  return Math.max(...levels) - Math.min(...levels)
}

/**
 * 主导情绪（众数）
 * 当天出现次数最多的情绪等级
 * 如果有多个并列，返回等级最高的那个（偏向积极的解释）
 * @returns null 表示无数据
 */
export function getDominantMood(records: MoodRecord[], date: string): MoodLevel | null {
  const dayRecords = getMoodsByDate(records, date)
  if (dayRecords.length === 0) return null

  const counts: Record<number, number> = {}
  dayRecords.forEach((r) => {
    counts[r.level] = (counts[r.level] || 0) + 1
  })

  let maxCount = 0
  let dominantLevel: MoodLevel = 1
  Object.entries(counts).forEach(([level, count]) => {
    const lvl = Number(level) as MoodLevel
    if (count > maxCount || (count === maxCount && lvl > dominantLevel)) {
      maxCount = count
      dominantLevel = lvl
    }
  })

  return dominantLevel
}

/**
 * 将平均情绪等级四舍五入到最近的整数等级
 * 用于将平均值映射到 1-5 的具体情绪等级
 */
export function roundMoodLevel(avg: number): MoodLevel | null {
  if (avg <= 0) return null
  return Math.round(avg) as MoodLevel
}
