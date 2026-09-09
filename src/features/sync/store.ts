import { create } from 'zustand'
import { useAuthStore } from '@/features/auth/store'
import { useCycleStore } from '@/features/cycle/store'
import { useMoodStore } from '@/features/mood/store'
import { useScheduleStore } from '@/features/schedule/store'
import { useTodoStore } from '@/features/todo/store'
import type { SyncStatus, SyncResult } from './types'
import { attachSyncRuntimeLifecycle } from './v1/SyncRuntime'
import { createConfiguredSyncRuntime } from './v1/configuredRuntime'

interface SyncStore extends SyncStatus {
  /** Changes after validated remote facts are committed and host views reload. */
  dataRevision: number
  syncNow: () => Promise<SyncResult>
  refreshPendingCount: () => Promise<void>
  startRuntimeListeners: () => () => void
}

async function refreshRemoteBackedViews(): Promise<void> {
  await Promise.all([
    useTodoStore.getState().loadAll(),
    useScheduleStore.getState().loadAll(),
    useMoodStore.getState().loadAll(),
    useCycleStore.getState().loadAll(),
  ])
  useSyncStore.setState((state) => ({ dataRevision: state.dataRevision + 1 }))
}

const syncRuntime = createConfiguredSyncRuntime(refreshRemoteBackedViews)
let stopRuntimeListeners: (() => void) | null = null

export const useSyncStore = create<SyncStore>((set, get) => ({
  isSyncing: false,
  isOnline: syncRuntime.isOnline(),
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
  dataRevision: 0,

  syncNow: async () => {
    if (!useAuthStore.getState().isAuthenticated) {
      const pendingCount = await syncRuntime.pendingCount().catch(() => 0)
      set({ pendingCount })
      return { success: false, pulled: 0, pushed: 0, errors: ['未登录，保持本地模式'] }
    }

    set({ isSyncing: true, error: null })
    try {
      const result = await syncRuntime.syncNow()
      set({
        lastSyncAt: result.success ? new Date().toISOString() : get().lastSyncAt,
        error: result.success ? null : result.errors?.join('; ') || '同步失败',
      })
      return result
    } finally {
      const pendingCount = await syncRuntime.pendingCount().catch(() => get().pendingCount)
      set({ isSyncing: syncRuntime.isSyncing(), pendingCount })
    }
  },

  refreshPendingCount: async () => {
    const pendingCount = await syncRuntime.pendingCount().catch(() => get().pendingCount)
    set({ pendingCount })
  },

  startRuntimeListeners: () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined
    if (stopRuntimeListeners !== null) return () => undefined

    const stop = attachSyncRuntimeLifecycle(
      {
        windowTarget: window,
        documentTarget: document,
        isOnline: () => navigator.onLine,
      },
      (isOnline) => set({ isOnline }),
      () => {
        if (useAuthStore.getState().isAuthenticated) void get().syncNow()
      },
    )
    stopRuntimeListeners = stop

    return () => {
      if (stopRuntimeListeners !== stop) return
      stop()
      stopRuntimeListeners = null
    }
  },
}))
