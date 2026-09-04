// ============================================================
// Dexie Database Definition
// 数据库名: plife-os
// 当前版本: 5
// ============================================================

import Dexie, { type Table } from 'dexie'
import type { Todo } from '@/features/todo/types'
import type { ScheduleEvent } from '@/features/schedule/types'
import type { MoodRecord } from '@/features/mood/types'
import type { PeriodRecord } from '@/features/cycle/types'
import type { DailyHealthSummary } from '@/features/health/types'
import type { ContinuityItem } from '@/features/continuity/types'
import type { ActionAuditRecord } from '@/features/action/types'

export const CURRENT_DATABASE_SCHEMA_VERSION = 5

export class AppDatabase extends Dexie {
  todos!: Table<Todo, string>
  scheduleEvents!: Table<ScheduleEvent, string>
  moodRecords!: Table<MoodRecord, string>
  periodRecords!: Table<PeriodRecord, string>
  dailyHealthSummaries!: Table<DailyHealthSummary, string>
  continuityItems!: Table<ContinuityItem, string>
  actionAuditRecords!: Table<ActionAuditRecord, string>

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

    // Version 4: 新增用户明确确认的长期 Continuity；不迁移或改写旧数据
    this.version(4).stores({
      continuityItems:
        'id, continuityType, status, relationshipId, createdAt, updatedAt, supersedesId, supersededById, [continuityType+status], [relationshipId+status]',
    })

    // Version 5: 新增 intelligence-mediated Todo Action 的无内容审计记录
    this.version(CURRENT_DATABASE_SCHEMA_VERSION).stores({
      actionAuditRecords:
        'executionId, proposalId, intelligenceRequestId, action, status, targetTodoId, createdAt',
    })
  }
}

// 单例
export const db = new AppDatabase()

export interface DatabaseMigrationStatus {
  databaseName: string
  schemaVersion: number
  ready: true
}

export class DatabaseMigrationError extends Error {
  readonly databaseName: string
  readonly targetSchemaVersion: number
  readonly causeName: string
  readonly causeMessage: string

  constructor(databaseName: string, cause: unknown) {
    const causeName = cause instanceof Error ? cause.name : 'UnknownError'
    const causeMessage = cause instanceof Error ? cause.message : String(cause)
    super(
      `LifeOS database migration failed for ${databaseName} at schema v${CURRENT_DATABASE_SCHEMA_VERSION}: ${causeName}: ${causeMessage}`,
    )
    this.name = 'DatabaseMigrationError'
    this.databaseName = databaseName
    this.targetSchemaVersion = CURRENT_DATABASE_SCHEMA_VERSION
    this.causeName = causeName
    this.causeMessage = causeMessage
  }
}

/** Explicit startup gate: callers receive success only after Dexie commits the upgrade. */
export async function openAppDatabase(
  database: Dexie = db,
): Promise<DatabaseMigrationStatus> {
  try {
    await database.open()
    if (database.verno !== CURRENT_DATABASE_SCHEMA_VERSION) {
      throw new Error(
        `opened schema v${database.verno}, expected v${CURRENT_DATABASE_SCHEMA_VERSION}`,
      )
    }
    return {
      databaseName: database.name,
      schemaVersion: database.verno,
      ready: true,
    }
  } catch (error) {
    database.close()
    throw new DatabaseMigrationError(database.name, error)
  }
}
