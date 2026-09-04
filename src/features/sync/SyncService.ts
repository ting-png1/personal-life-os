// ============================================================
// SyncService - 同步服务
// 本地优先 + 异步推送 + 登录全量拉取 + 离线模式支持
// 冲突策略：最后修改胜出（基于 updatedAt）
// ============================================================

import { db } from '@/data/database'
import { cloudRepository } from './CloudRepository'
import { SYNC_TABLES, type SyncTable, type SyncResult } from './types'

// The legacy four-table transport is incompatible with Sync v1 metadata,
// tombstones, and current Domain schemas. Keep it hard-disabled until a
// reviewed Supabase operation-log schema and RLS policy exist.
export const LEGACY_CLOUD_SYNC_ENABLED = false
const SYNC_V1_TRANSPORT_PENDING_MESSAGE =
  'Sync v1 云端 transport 尚未配置；本地数据与 durable outbox 保持可用'

// 本地 Dexie 表名映射
const LOCAL_TABLE_MAP: Record<SyncTable, keyof typeof db> = {
  todos: 'todos',
  schedule_events: 'scheduleEvents',
  mood_records: 'moodRecords',
  period_records: 'periodRecords',
}

// 推送队列持久化 key
const PUSH_QUEUE_STORAGE_KEY = 'lifeos_sync_push_queue'

type NetworkChangeListener = (isOnline: boolean) => void
type PushQueueItem = { table: SyncTable; record?: Record<string, unknown>; id?: string; type: 'upsert' | 'remove' }

class SyncService {
  private isPulling = false
  private pushQueue: PushQueueItem[] = []
  private isPushing = false
  private online: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private networkListeners: NetworkChangeListener[] = []

  constructor() {
    this.setupNetworkListeners()
    this.restoreQueue()
  }

  /**
   * 从 localStorage 恢复推送队列
   */
  private restoreQueue(): void {
    try {
      if (typeof localStorage === 'undefined') return
      const saved = localStorage.getItem(PUSH_QUEUE_STORAGE_KEY)
      if (saved) {
        this.pushQueue = JSON.parse(saved) as PushQueueItem[]
        if (this.pushQueue.length > 0) {
          console.log(`[SyncService] 恢复 ${this.pushQueue.length} 条待推送变更`)
          // 如果在线，立即处理队列
          if (this.online) {
            setTimeout(() => this.processQueue(), 1000)
          }
        }
      }
    } catch (error) {
      console.error('[SyncService] 恢复推送队列失败:', error)
      this.pushQueue = []
    }
  }

  /**
   * 保存推送队列到 localStorage
   */
  private saveQueue(): void {
    try {
      if (typeof localStorage === 'undefined') return
      if (this.pushQueue.length === 0) {
        localStorage.removeItem(PUSH_QUEUE_STORAGE_KEY)
      } else {
        localStorage.setItem(PUSH_QUEUE_STORAGE_KEY, JSON.stringify(this.pushQueue))
      }
    } catch (error) {
      console.error('[SyncService] 保存推送队列失败:', error)
    }
  }

  /**
   * 设置网络状态监听
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      this.online = true
      this.notifyNetworkChange(true)
      // 联网后自动处理推送队列 + 全量拉取
      this.processQueue()
      this.autoPullOnReconnect()
    })

    window.addEventListener('offline', () => {
      this.online = false
      this.notifyNetworkChange(false)
    })
  }

  /**
   * 联网后自动拉取（延迟 2 秒，避免网络刚恢复时不稳定）
   */
  private autoPullTimer: ReturnType<typeof setTimeout> | null = null

  private autoPullOnReconnect(): void {
    if (this.autoPullTimer) {
      clearTimeout(this.autoPullTimer)
    }
    this.autoPullTimer = setTimeout(async () => {
      try {
        const authenticated = await cloudRepository.isAuthenticated()
        if (authenticated && this.online) {
          await this.pullAll()
        }
      } catch (error) {
        console.error('[SyncService] auto pull on reconnect error:', error)
      }
    }, 2000)
  }

  /**
   * 通知网络状态变化
   */
  private notifyNetworkChange(isOnline: boolean): void {
    this.networkListeners.forEach((listener) => {
      try {
        listener(isOnline)
      } catch (error) {
        console.error('[SyncService] network listener error:', error)
      }
    })
  }

  /**
   * 订阅网络状态变化
   */
  onNetworkChange(listener: NetworkChangeListener): () => void {
    this.networkListeners.push(listener)
    // 立即通知当前状态
    listener(this.online)
    return () => {
      this.networkListeners = this.networkListeners.filter((l) => l !== listener)
    }
  }

  /**
   * 获取当前网络状态
   */
  isOnline(): boolean {
    return this.online
  }

  /**
   * 登录后全量拉取：从云端拉取所有数据到本地
   * 冲突策略：云端 updatedAt 更新则覆盖本地
   */
  async pullAll(): Promise<SyncResult> {
    if (!LEGACY_CLOUD_SYNC_ENABLED) {
      return { success: false, pulled: 0, errors: [SYNC_V1_TRANSPORT_PENDING_MESSAGE] }
    }
    if (this.isPulling) {
      return { success: false, errors: ['正在同步中，请稍候'] }
    }

    if (!this.online) {
      return { success: false, errors: ['当前离线，无法同步'] }
    }

    this.isPulling = true
    const errors: string[] = []
    let pulled = 0

    try {
      const authenticated = await cloudRepository.isAuthenticated()
      if (!authenticated) {
        return { success: false, errors: ['未登录，无法同步'] }
      }

      for (const table of SYNC_TABLES) {
        try {
          const cloudRecords = await cloudRepository.getAll(table)
          const localTable = db[LOCAL_TABLE_MAP[table]] as any

          for (const cloudRecord of cloudRecords) {
            const localRecord = await localTable.get(cloudRecord.id)
            // 云端更新或本地不存在，则覆盖
            if (!localRecord || new Date(cloudRecord.updatedAt as string) > new Date(localRecord.updatedAt)) {
              await localTable.put(cloudRecord)
              pulled++
            }
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          errors.push(`${table}: ${msg}`)
          console.error(`[SyncService] pull ${table} error:`, error)
        }
      }

      return { success: errors.length === 0, pulled, errors }
    } finally {
      this.isPulling = false
    }
  }

  /**
   * 全量推送：将本地所有数据推送到云端
   * 用于修复之前推送失败的数据
   */
  async pushAll(): Promise<SyncResult> {
    if (!LEGACY_CLOUD_SYNC_ENABLED) {
      return { success: false, pushed: 0, errors: [SYNC_V1_TRANSPORT_PENDING_MESSAGE] }
    }
    if (!this.online) {
      return { success: false, errors: ['当前离线，无法同步'] }
    }

    const authenticated = await cloudRepository.isAuthenticated()
    if (!authenticated) {
      return { success: false, errors: ['未登录，无法同步'] }
    }

    const errors: string[] = []
    let pushed = 0

    for (const table of SYNC_TABLES) {
      try {
        const localTable = db[LOCAL_TABLE_MAP[table]] as any
        const records = await localTable.toArray()
        for (const record of records) {
          try {
            await cloudRepository.upsert(table, record as Record<string, unknown>)
            pushed++
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            errors.push(`${table}/${record.id}: ${msg}`)
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`${table}: ${msg}`)
        console.error(`[SyncService] push ${table} error:`, error)
      }
    }

    return { success: errors.length === 0, pushed, errors }
  }

  /**
   * 单条数据变更后异步推送
   * 离线时累积在队列中，联网后自动推送
   */
  pushOne(table: SyncTable, record: Record<string, unknown>): void {
    if (!LEGACY_CLOUD_SYNC_ENABLED) return
    this.pushQueue.push({ table, record, type: 'upsert' })
    this.saveQueue()
    this.processQueue()
  }

  /**
   * 删除时推送删除标记
   * 离线时累积在队列中，联网后自动推送
   */
  pushRemove(table: SyncTable, id: string): void {
    if (!LEGACY_CLOUD_SYNC_ENABLED) return
    this.pushQueue.push({ table, id, type: 'remove' })
    this.saveQueue()
    this.processQueue()
  }

  /**
   * 处理推送队列（串行执行，避免并发冲突）
   * 离线时不执行，等待联网后自动处理
   */
  private async processQueue(): Promise<void> {
    if (!LEGACY_CLOUD_SYNC_ENABLED) return
    if (this.isPushing || this.pushQueue.length === 0) return
    if (!this.online) {
      console.log(`[SyncService] 离线模式，${this.pushQueue.length} 条变更待推送`)
      return
    }

    this.isPushing = true
    try {
      const authenticated = await cloudRepository.isAuthenticated()
      if (!authenticated) {
        // 未登录，清空队列（下次登录全量拉取会修复）
        this.pushQueue = []
        this.saveQueue()
        return
      }

      while (this.pushQueue.length > 0 && this.online) {
        const item = this.pushQueue.shift()
        if (!item) continue

        try {
          if (item.type === 'upsert' && item.record) {
            await cloudRepository.upsert(item.table, item.record)
          } else if (item.type === 'remove' && item.id) {
            await cloudRepository.remove(item.table, item.id)
          }
        } catch (error) {
          console.error(`[SyncService] push ${item.table} error:`, error)
          // 网络错误时重新放回队列，下次重试
          if (!this.online || (error instanceof Error && (error.message.includes('network') || error.message.includes('fetch')))) {
            this.pushQueue.unshift(item)
            break
          }
          // 其他错误（如权限、数据格式）不重试，下次登录全量拉取会修复
        }
      }
    } finally {
      this.isPushing = false
      this.saveQueue()
    }
  }

  /**
   * 获取待推送数量
   */
  getPendingCount(): number {
    return this.pushQueue.length
  }

  /**
   * 检查是否正在同步
   */
  getIsSyncing(): boolean {
    return this.isPulling || this.isPushing
  }

  /**
   * 手动触发推送队列处理（用于联网后或登录后）
   */
  flushQueue(): void {
    this.processQueue()
  }
}

export const syncService = new SyncService()
