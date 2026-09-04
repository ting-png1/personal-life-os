// ============================================================
// Sync v1 façade
// Local CRUD never waits for this service. It only drains the durable Dexie
// outbox and applies validated relay operations through SyncEngine.
// ============================================================

import { db } from '@/data/database'
import { SyncEngine } from './v1/SyncEngine'
import { createConfiguredSyncTransport } from './v1/configuredTransport'
import { ensureSyncAccountBinding } from './v1/localMutation'
import type { SupabaseSyncTransport } from './v1/SupabaseSyncTransport'
import type { SyncResult } from './types'

const SYNC_NOT_CONFIGURED = 'Supabase Sync Relay 未配置；本地数据与 outbox 保持可用'
type NetworkChangeListener = (isOnline: boolean) => void

class SyncService {
  private readonly engine: SyncEngine | null
  private readonly transport: SupabaseSyncTransport | null
  private online = typeof navigator !== 'undefined' ? navigator.onLine : true
  private running = false
  private pendingCount = 0
  private networkListeners: NetworkChangeListener[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    const transport = createConfiguredSyncTransport()
    this.transport = transport
    this.engine = transport === null ? null : new SyncEngine(transport, { database: db })
    this.setupNetworkListeners()
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return
    window.addEventListener('online', () => {
      this.online = true
      this.notifyNetworkChange(true)
      this.scheduleReconnectSync()
    })
    window.addEventListener('offline', () => {
      this.online = false
      this.notifyNetworkChange(false)
    })
  }

  private scheduleReconnectSync(): void {
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.pullAll()
    }, 2000)
  }

  private notifyNetworkChange(isOnline: boolean): void {
    for (const listener of this.networkListeners) {
      try {
        listener(isOnline)
      } catch (error) {
        console.error('[SyncService] network listener error:', error)
      }
    }
  }

  private unavailableResult(): SyncResult {
    return { success: false, pulled: 0, pushed: 0, errors: [SYNC_NOT_CONFIGURED] }
  }

  private offlineResult(): SyncResult {
    return { success: false, pulled: 0, pushed: 0, errors: ['当前离线，稍后将重试同步'] }
  }

  private async refreshPendingCount(): Promise<void> {
    this.pendingCount = this.engine === null ? 0 : await this.engine.pendingCount()
  }

  private async prepareAuthenticatedSync(): Promise<void> {
    if (this.transport === null) throw new Error(SYNC_NOT_CONFIGURED)
    const userId = await this.transport.currentAuthenticatedUserId()
    await ensureSyncAccountBinding(db, userId)
    this.transport.bindExpectedUser(userId)
  }

  onNetworkChange(listener: NetworkChangeListener): () => void {
    this.networkListeners.push(listener)
    listener(this.online)
    return () => {
      this.networkListeners = this.networkListeners.filter((item) => item !== listener)
    }
  }

  isOnline(): boolean {
    return this.online
  }

  /**
   * Runs a complete push-then-pull cycle. The historical method name is kept
   * so existing startup/UI callers do not gain a second orchestration path.
   */
  async pullAll(): Promise<SyncResult> {
    if (!this.online) return this.offlineResult()
    if (this.engine === null) return this.unavailableResult()
    if (this.running) return { success: false, errors: ['同步正在进行'] }

    this.running = true
    try {
      await this.prepareAuthenticatedSync()
      const result = await this.engine.runCycle()
      await this.refreshPendingCount()
      const blocked = await db.syncOutbox.where('status').equals('blocked').count()
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
      await this.refreshPendingCount()
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      }
    } finally {
      this.running = false
    }
  }

  /** Drains accepted outbox batches without reading remote operations. */
  async pushAll(): Promise<SyncResult> {
    if (!this.online) return this.offlineResult()
    if (this.engine === null) return this.unavailableResult()
    if (this.running) return { success: false, errors: ['同步正在进行'] }

    this.running = true
    let pushed = 0
    let blocked = 0
    try {
      await this.prepareAuthenticatedSync()
      for (let batch = 0; batch < 50; batch += 1) {
        const result = await this.engine.pushPending()
        pushed += result.pushed
        blocked += result.blocked
        if (result.pushed === 0 || await this.engine.pendingCount() === 0) break
      }
      await this.refreshPendingCount()
      const errors = [
        ...(blocked > 0 ? [`${blocked} 条本地 operation 被 relay 拒绝`] : []),
        ...(this.pendingCount > 0 ? [`${this.pendingCount} 条 operation 等待重试`] : []),
      ]
      return { success: errors.length === 0, pushed, errors }
    } catch (error) {
      await this.refreshPendingCount()
      return {
        success: false,
        pushed,
        errors: [error instanceof Error ? error.message : String(error)],
      }
    } finally {
      this.running = false
    }
  }

  getPendingCount(): number {
    return this.pendingCount
  }

  getIsSyncing(): boolean {
    return this.running
  }

  flushQueue(): void {
    if (this.online) void this.pushAll()
  }
}

export const syncService = new SyncService()
