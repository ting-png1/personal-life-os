// ============================================================
// Dexie Database Definition
// 数据库名: plife-os
// 当前版本: 3
// ============================================================

import Dexie, { type Table } from 'dexie'
import type { Todo } from '@/features/todo/types'
import type { ScheduleEvent } from '@/features/schedule/types'
import type { MoodRecord } from '@/features/mood/types'
import type { PeriodRecord } from '@/features/cycle/types'
import type { DailyHealthSummary } from '@/features/health/types'

export class AppDatabase extends Dexie {
  todos!: Table<Todo, string>
  scheduleEvents!: Table<ScheduleEvent, string>
  moodRecords!: Table<MoodRecord, string>
  periodRecords!: Table<PeriodRecord, string>
  dailyHealthSummaries!: Table<DailyHealthSummary, string>

  constructor(name = 'plife-os') {
    super(name)

    // Version 1: 初始表结构
    this.version(1).stores({
      todos: 'id, dueDate, completed, priority, createdAt',
      scheduleEvents: 'id, type, startDateTime, createdAt',
      moodRecords: 'id, date, createdAt',
    })

    // Version 2: 新增生理周期表
    this.version(2).stores({
      periodRecords: 'id, startDate, endDate, createdAt',
    })

    // Version 3: 新增按本地日期唯一的 normalized Health 摘要表；旧表原样保留
    this.version(3).stores({
      dailyHealthSummaries: 'date',
    })
  }
}

// 单例
export const db = new AppDatabase()
