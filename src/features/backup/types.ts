import type { ActionAuditRecord } from '../action/types.ts'
import type { AutomationGovernanceSettings } from '../automation/types.ts'
import type { ContinuityItem } from '../continuity/types.ts'
import type { PeriodRecord } from '../cycle/types.ts'
import type { DailyHealthSummary } from '../health/types.ts'
import type { MoodRecord } from '../mood/types.ts'
import type { NotificationSettings } from '../notification/types.ts'
import type { ScheduleEvent } from '../schedule/types.ts'
import type { Todo } from '../todo/types.ts'

export const LIFEOS_DATA_PACKAGE_SCHEMA_VERSION = 1 as const

export interface LifeOSBackupData {
  todos: Todo[]
  scheduleEvents: ScheduleEvent[]
  moodRecords: MoodRecord[]
  periodRecords: PeriodRecord[]
  dailyHealthSummaries: DailyHealthSummary[]
  continuityItems: ContinuityItem[]
  actionAuditRecords: ActionAuditRecord[]
}

export type LifeOSBackupDataset = keyof LifeOSBackupData
export type LifeOSRecordCounts = Record<LifeOSBackupDataset, number>

export type NotificationBackupSettings = Omit<
  NotificationSettings,
  'browserPermission'
>

/** Credentials and runtime counters are intentionally not portable. */
export interface AIBackupPreferences {
  dailyLimit: number
  model: string
}

export interface LifeOSBackupSettings {
  notification: NotificationBackupSettings
  aiPreferences: AIBackupPreferences
  automationGovernance: AutomationGovernanceSettings
}

export interface LifeOSDataPackageV1 {
  format: 'lifeos-data-package'
  schemaVersion: typeof LIFEOS_DATA_PACKAGE_SCHEMA_VERSION
  exportedAt: string
  metadata: {
    app: 'LifeOS'
    packageKind: 'full-local-backup'
    databaseSchemaVersion: number
    recordCounts: LifeOSRecordCounts
    settingsIncluded: [
      'notification',
      'aiPreferences',
      'automationGovernance',
    ]
    excluded: [
      'derived-state',
      'credentials',
      'device-permissions',
      'runtime-counters',
      'sync-state',
    ]
  }
  data: LifeOSBackupData
  settings: LifeOSBackupSettings
}

export interface PreparedLifeOSRestore {
  package: LifeOSDataPackageV1
  source: 'schema-v1' | 'legacy-3.0.0'
  /** Legacy exports did not contain portable settings, so restore preserves them. */
  settingsMode: 'replace' | 'preserve'
}

export interface LifeOSRestoreResult {
  source: PreparedLifeOSRestore['source']
  schemaVersion: typeof LIFEOS_DATA_PACKAGE_SCHEMA_VERSION
  restoredAt: string
  recordCounts: LifeOSRecordCounts
  settingsMode: PreparedLifeOSRestore['settingsMode']
  verified: true
}

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
