// ============================================================
// TodayAggregator — 纯函数
// 从 Todo / Schedule / Mood 三个数据源聚合出 TodayState
// 不依赖 React / DOM / Dexie，可单测可移植
// TodayState 是派生 ViewModel，不入库、不持久化
// ============================================================

import type { Todo } from '@/features/todo/types'
import type { ScheduleEvent } from '@/features/schedule/types'
import type { MoodRecord } from '@/features/mood/types'
import type { TodayState } from '../types'
import { expandEventsForDate, getCurrentInstance, getNextInstance } from '@/features/schedule/services/ScheduleExpander'
import { filterDueToday, filterCompletedToday, calculateCompletion } from '@/features/todo/services/todoServices'
import { getLatestMoodByDate, hasMoodOnDate, getMoodCountByDate, buildDailyMood } from '@/features/mood/services/moodAggregator'
import { getWeekdayCN, getGreeting } from '@/shared/lib/date'

/**
 * 聚合今日状态
 * @param date 日期 "YYYY-MM-DD"
 * @param todos 全部 Todo
 * @param events 全部 ScheduleEvent
 * @param moods 全部 MoodRecord
 */
export function buildTodayState(
  date: string,
  todos: Todo[],
  events: ScheduleEvent[],
  moods: MoodRecord[]
): TodayState {
  // 1. 日期与问候
  const weekday = getWeekdayCN(date)
  const greeting = getGreeting()

  // 2. 情绪
  const latestMood = getLatestMoodByDate(moods, date)
  const hasRecorded = hasMoodOnDate(moods, date)
  const moodCount = getMoodCountByDate(moods, date)
  const dailyMood = buildDailyMood(moods, date)

  // 3. 日程（展开重复事件）
  const scheduleItems = expandEventsForDate(events, date)
  const currentItem = getCurrentInstance(scheduleItems)
  const nextItem = getNextInstance(scheduleItems)

  // 4. 待办
  const dueToday = filterDueToday(todos, date)
  const completedToday = filterCompletedToday(todos, date)
  const allToday = [...dueToday, ...completedToday]
  const totalDue = dueToday.length + completedToday.length
  const completedCount = completedToday.length
  const completionRate = calculateCompletion(totalDue, completedCount)

  return {
    date,
    weekday,
    greeting,
    mood: {
      latest: latestMood,
      hasRecorded,
      count: moodCount,
      daily: dailyMood,
    },
    schedule: {
      items: scheduleItems,
      nextItem,
      currentItem,
      total: scheduleItems.length,
    },
    todos: {
      dueToday,
      completedToday,
      allToday,
      totalDue,
      completedCount,
      completionRate,
    },
  }
}
