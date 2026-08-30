// ============================================================
// SyncService - 同步服务
// 本地优先 + 异步推送 + 登录全量拉取
// 冲突策略：最后修改胜出（基于 updatedAt）
// ============================================================

import { db } from '@/data/database'
import { cloudRepository } from './CloudRepository'
import { SYNC_TABLES, type SyncTable, type SyncResult } from './types'

// 本地 Dexie 表名映射
const LOCAL_TABLE_MAP: Record<SyncTable, keyof typeof db> = {
  todos: 'todos',
  schedule_events: 'scheduleEvents',
  mood_records: 'moodRecords',
  period_records: 'periodRecords',
}

class SyncService {
  private isPulling = false
  private pushQueue: Array<{ table: SyncTable; record?: Record<string, unknown>; id?: string; type: 'upsert' | 'remove' }> = []
  private isPushing = false

  /**
   * 登录后全量拉取：从云端拉取所有数据到本地
   * 冲突策略：云端 updatedAt 更新则覆盖本地
   */
  async pullAll(): Promise<SyncResult> {
    if (this.isPulling) {
      return { success: false, errors: ['正在同步中，请稍候'] }
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
   * 单条数据变更后异步推送
   */
  pushOne(table: SyncTable, record: Record<string, unknown>): void {
    this.pushQueue.push({ table, record, type: 'upsert' })
    this.processQueue()
  }

  /**
   * 删除时推送删除标记
   */
  pushRemove(table: SyncTable, id: string): void {
    this.pushQueue.push({ table, id, type: 'remove' })
    this.processQueue()
  }

  /**
   * 处理推送队列（串行执行，避免并发冲突）
   */
  private async processQueue(): Promise<void> {
    if (this.isPushing || this.pushQueue.length === 0) return

    this.isPushing = true
    try {
      const authenticated = await cloudRepository.isAuthenticated()
      if (!authenticated) {
        // 未登录，清空队列（下次登录全量拉取会修复）
        this.pushQueue = []
        return
      }

      while (this.pushQueue.length > 0) {
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
          // 推送失败不重试，下次登录全量拉取会修复
        }
      }
    } finally {
      this.isPushing = false
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
}

export const syncService = new SyncService()
