export interface SyncStatus {
  isSyncing: boolean
  isOnline: boolean
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
