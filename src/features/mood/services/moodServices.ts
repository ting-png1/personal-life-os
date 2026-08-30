// ============================================================
// Mood Pure Logic Services
// 不依赖 React / DOM / Dexie，可单测可移植
// ============================================================

import type { MoodRecord, MoodLevel } from '../types'

/** 获取指定日期的所有情绪记录 */
export function getMoodsByDate(records: MoodRecord[], date: string): MoodRecord[] {
  return records.filter((r) => r.date === date)
}

/** 获取指定日期最新的一条情绪记录 */
export function getLatestMoodByDate(records: MoodRecord[], date: string): MoodRecord | null {
  const dayRecords = getMoodsByDate(records, date)
  if (dayRecords.length === 0) return null
  return dayRecords.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0]
}

/** 判断指定日期是否已记录情绪 */
export function hasMoodOnDate(records: MoodRecord[], date: string): boolean {
  return getMoodsByDate(records, date).length > 0
}

/** 计算指定日期的平均情绪等级（0 表示无数据） */
export function getAverageMoodLevel(records: MoodRecord[], date: string): number {
  const dayRecords = getMoodsByDate(records, date)
  if (dayRecords.length === 0) return 0
  const sum = dayRecords.reduce((acc, r) => acc + r.level, 0)
  return sum / dayRecords.length
}

/** 情绪等级对应的表情符号 */
export const MOOD_EMOJIS: Record<MoodLevel, string> = {
  1: '😢',
  2: '😔',
  3: '😐',
  4: '🙂',
  5: '😊',
}
