// ============================================================
// Sync Store - 同步状态管理
// ============================================================

import { create } from 'zustand'
import { syncService } from './SyncService'
import type { SyncStatus, SyncResult } from './types'

interface SyncStore extends SyncStatus {
  pullAll: () => Promise<SyncResult>
  setSyncing: (syncing: boolean) => void
  setOnline: (online: boolean) => void
  setLastSyncAt: (time: string) => void
  setError: (error: string | null) => void
  refreshPendingCount: () => void
  initNetworkListener: () => void
}

let networkListenerInitialized = false

export const useSyncStore = create<SyncStore>((set) => ({
  isSyncing: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSyncAt: null,
  pendingCount: 0,
  error: null,

  initNetworkListener: () => {
    if (networkListenerInitialized) return
    networkListenerInitialized = true
    syncService.onNetworkChange((isOnline) => {
      set({ isOnline })
      if (isOnline) {
        // 联网后刷新待推送数量
        set({ pendingCount: syncService.getPendingCount() })
      }
    })
  },

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
      set({ isSyncing: false, pendingCount: syncService.getPendingCount() })
    }
  },

  setSyncing: (isSyncing) => set({ isSyncing }),
  setOnline: (isOnline) => set({ isOnline }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setError: (error) => set({ error }),
  refreshPendingCount: () => set({ pendingCount: syncService.getPendingCount() }),
}))
