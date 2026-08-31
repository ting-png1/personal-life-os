// ============================================================
// TodayState Types
// TodayState 是派生 ViewModel，不是数据库实体，不持久化
// ============================================================

import type { Todo } from '@/features/todo/types'
import type { MoodRecord } from '@/features/mood/types'
import type { ScheduleInstance } from '@/features/schedule/types'

export interface TodayState {
  date: string // "YYYY-MM-DD"
  weekday: string // "星期日"
  greeting: string // "早上好"

  mood: {
    latest: MoodRecord | null
    hasRecorded: boolean
    count: number // 当天情绪记录数量
  }

  schedule: {
    items: ScheduleInstance[]
    nextItem: ScheduleInstance | null
    currentItem: ScheduleInstance | null
    total: number
  }

  todos: {
    dueToday: Todo[]
    completedToday: Todo[]
    allToday: Todo[]
    totalDue: number
    completedCount: number
    completionRate: number // 0-1
  }
}
