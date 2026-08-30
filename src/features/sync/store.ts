// ============================================================
// Sync Store - 同步状态管理
// ============================================================

import { create } from 'zustand'
import { syncService } from './SyncService'
import type { SyncStatus, SyncResult } from './types'

interface SyncStore extends SyncStatus {
  pullAll: () => Promise<SyncResult>
  setSyncing: (syncing: boolean) => void
  setLastSyncAt: (time: string) => void
  setError: (error: string | null) => void
  refreshPendingCount: () => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0,
  error: null,

  pullAll: async () => {
    set({ isSyncing: true, error: null })
    try {
      const result = await syncService.pullAll()
      if (result.success) {
        set({
          lastSyncAt: new Date().toISOString(),
          error: null,
        })
      } else {
        set({ error: result.errors?.join('; ') || '同步失败' })
      }
      return result
    } finally {
      set({ isSyncing: false })
    }
  },

  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setError: (error) => set({ error }),
  refreshPendingCount: () => set({ pendingCount: syncService.getPendingCount() }),
}))
