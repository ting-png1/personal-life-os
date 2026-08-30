// ============================================================
// Cycle Repository
// 经期记录的数据访问层
// ============================================================

import { db } from '@/data/database'
import { generateId } from '@/shared/lib/id'
import { nowISO } from '@/shared/lib/date'
import { syncService } from '@/features/sync/SyncService'
import type { PeriodRecord, CreatePeriodInput, UpdatePeriodInput } from './types'

export interface ICycleRepository {
  getAll(): Promise<PeriodRecord[]>
  getById(id: string): Promise<PeriodRecord | undefined>
  create(input: CreatePeriodInput): Promise<PeriodRecord>
  update(id: string, patch: UpdatePeriodInput): Promise<PeriodRecord>
  remove(id: string): Promise<void>
  /** 获取当前进行中的经期记录（endDate 为 null） */
  getCurrentPeriod(): Promise<PeriodRecord | undefined>
  /** 获取指定日期范围内的经期记录 */
  getByDateRange(startDate: string, endDate: string): Promise<PeriodRecord[]>
}

class DexieCycleRepository implements ICycleRepository {
  async getAll(): Promise<PeriodRecord[]> {
    // 按开始日期降序（最新的在前）
    return db.periodRecords.orderBy('startDate').reverse().toArray()
  }

  async getById(id: string): Promise<PeriodRecord | undefined> {
    return db.periodRecords.get(id)
  }

  async create(input: CreatePeriodInput): Promise<PeriodRecord> {
    const now = nowISO()
    const record: PeriodRecord = {
      id: generateId(),
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      flowLevel: input.flowLevel ?? null,
      symptoms: input.symptoms ?? [],
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await db.periodRecords.add(record)
    // 异步推送到云端
    syncService.pushOne('period_records', record as unknown as Record<string, unknown>)
    return record
  }

  async update(id: string, patch: UpdatePeriodInput): Promise<PeriodRecord> {
    const existing = await db.periodRecords.get(id)
    if (!existing) {
      throw new Error(`PeriodRecord not found: ${id}`)
    }
    const updated: PeriodRecord = {
      ...existing,
      ...patch,
      updatedAt: nowISO(),
    }
    await db.periodRecords.put(updated)
    // 异步推送到云端
    syncService.pushOne('period_records', updated as unknown as Record<string, unknown>)
    return updated
  }

  async remove(id: string): Promise<void> {
    await db.periodRecords.delete(id)
    // 异步推送删除标记到云端
    syncService.pushRemove('period_records', id)
  }

  async getCurrentPeriod(): Promise<PeriodRecord | undefined> {
    // endDate 为 null 表示正在进行中
    const all = await this.getAll()
    return all.find((r) => r.endDate === null)
  }

  async getByDateRange(startDate: string, endDate: string): Promise<PeriodRecord[]> {
    return db.periodRecords
      .where('startDate')
      .between(startDate, endDate, true, true)
      .toArray()
  }
}

export const cycleRepository: ICycleRepository = new DexieCycleRepository()
