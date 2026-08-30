// ============================================================
// Sync 模块类型定义
// ============================================================

export type SyncTable = 'todos' | 'schedule_events' | 'mood_records' | 'period_records'

export interface SyncStatus {
  isSyncing: boolean
  lastSyncAt: string | null
  pendingCount: number
  error: string | null
}

export interface SyncResult {
  success: boolean
  pulled?: number
  pushed?: number
  errors?: string[]
}

export interface CloudRecord {
  id: string
  user_id?: string
  [key: string]: unknown
}

export const SYNC_TABLES: SyncTable[] = [
  'todos',
  'schedule_events',
  'mood_records',
  'period_records',
]
