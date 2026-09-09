import { type AppDatabase, db } from '../../../data/database.ts'
import type { SyncResult } from '../types.ts'
import { ensureSyncAccountBinding } from './localMutation.ts'
import type { SyncCycleResult } from './types.ts'

const SYNC_NOT_CONFIGURED = 'Supabase Sync Relay 未配置；本地数据与 outbox 保持可用'

export interface SyncRuntimeTransport {
  currentAuthenticatedUserId(): Promise<string>
  bindExpectedUser(userId: string): void
}

export interface SyncRuntimeEngine {
  runCycle(): Promise<SyncCycleResult>
}

export interface SyncRuntimeOptions {
  database?: AppDatabase
  transport: SyncRuntimeTransport | null
  engine: SyncRuntimeEngine | null
  isOnline?: () => boolean
  bindAccount?: (database: AppDatabase, userId: string) => Promise<void>
  onRemoteApplied?: (result: SyncCycleResult) => Promise<void> | void
}

/**
 * Single application runtime boundary for Sync v1.
 *
 * Local repositories own writes and durable outbox creation. This runtime only
 * authenticates, drains/pulls through SyncEngine, and asks the host to refresh
 * in-memory views after validated remote operations have committed to Dexie.
 */
export class SyncRuntime {
  private readonly database: AppDatabase
  private readonly transport: SyncRuntimeTransport | null
  private readonly engine: SyncRuntimeEngine | null
  private readonly readOnlineState: () => boolean
  private readonly bindAccount: (database: AppDatabase, userId: string) => Promise<void>
  private readonly onRemoteApplied: (result: SyncCycleResult) => Promise<void> | void
  private activeCycle: Promise<SyncResult> | null = null

  constructor(options: SyncRuntimeOptions) {
    this.database = options.database ?? db
    this.transport = options.transport
    this.engine = options.engine
    this.readOnlineState = options.isOnline ?? (() =>
      typeof navigator === 'undefined' ? true : navigator.onLine)
    this.bindAccount = options.bindAccount ?? ensureSyncAccountBinding
    this.onRemoteApplied = options.onRemoteApplied ?? (() => undefined)
  }

  isOnline(): boolean {
    return this.readOnlineState()
  }

  isSyncing(): boolean {
    return this.activeCycle !== null
  }

  async pendingCount(): Promise<number> {
    return this.database.syncOutbox.where('status').equals('pending').count()
  }

  syncNow(): Promise<SyncResult> {
    if (this.activeCycle !== null) return this.activeCycle
    const cycle = this.executeCycle().finally(() => {
      if (this.activeCycle === cycle) this.activeCycle = null
    })
    this.activeCycle = cycle
    return cycle
  }

  private async executeCycle(): Promise<SyncResult> {
    if (!this.isOnline()) {
      return { success: false, pulled: 0, pushed: 0, errors: ['当前离线，稍后将重试同步'] }
    }
    if (this.transport === null || this.engine === null) {
      return { success: false, pulled: 0, pushed: 0, errors: [SYNC_NOT_CONFIGURED] }
    }

    try {
      const userId = await this.transport.currentAuthenticatedUserId()
      await this.bindAccount(this.database, userId)
      this.transport.bindExpectedUser(userId)

      const result = await this.engine.runCycle()
      if (result.pulled > 0) await this.onRemoteApplied(result)

      const blocked = await this.database.syncOutbox.where('status').equals('blocked').count()
      const errors = [
        ...(result.error ? [result.error] : []),
        ...(result.rejectedRemote > 0
          ? [`${result.rejectedRemote} 条云端 operation 未通过本地校验`]
          : []),
        ...(blocked > 0 ? [`${blocked} 条本地 operation 被 relay 拒绝`] : []),
      ]

      return {
        success: result.complete && errors.length === 0,
        pushed: result.pushed,
        pulled: result.pulled,
        errors,
      }
    } catch (error) {
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      }
    }
  }
}

export interface SyncRuntimeLifecycleEnvironment {
  windowTarget: Pick<Window, 'addEventListener' | 'removeEventListener'>
  documentTarget: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>
  isOnline: () => boolean
}

/** Attach the three browser/PWA wake-up signals without owning a second sync engine. */
export function attachSyncRuntimeLifecycle(
  environment: SyncRuntimeLifecycleEnvironment,
  onNetworkChange: (online: boolean) => void,
  requestSync: () => void,
): () => void {
  const requestWhenOnline = () => {
    if (environment.isOnline()) requestSync()
  }
  const handleOnline = () => {
    onNetworkChange(true)
    requestSync()
  }
  const handleOffline = () => onNetworkChange(false)
  const handleFocus = () => requestWhenOnline()
  const handleVisibility = () => {
    if (environment.documentTarget.visibilityState === 'visible') requestWhenOnline()
  }

  onNetworkChange(environment.isOnline())
  environment.windowTarget.addEventListener('online', handleOnline)
  environment.windowTarget.addEventListener('offline', handleOffline)
  environment.windowTarget.addEventListener('focus', handleFocus)
  environment.documentTarget.addEventListener('visibilitychange', handleVisibility)

  return () => {
    environment.windowTarget.removeEventListener('online', handleOnline)
    environment.windowTarget.removeEventListener('offline', handleOffline)
    environment.windowTarget.removeEventListener('focus', handleFocus)
    environment.documentTarget.removeEventListener('visibilitychange', handleVisibility)
  }
}
