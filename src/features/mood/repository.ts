// ============================================================
// Mood Repository
// ============================================================

import { db } from '@/data/database'
import { generateId } from '@/shared/lib/id'
import { nowISO, todayStr } from '@/shared/lib/date'
import { syncService } from '@/features/sync/SyncService'
import type { MoodRecord, CreateMoodInput, UpdateMoodInput } from './types'

export interface IMoodRepository {
  getAll(): Promise<MoodRecord[]>
  getById(id: string): Promise<MoodRecord | undefined>
  create(input: CreateMoodInput): Promise<MoodRecord>
  update(id: string, patch: UpdateMoodInput): Promise<MoodRecord>
  remove(id: string): Promise<void>
}

class DexieMoodRepository implements IMoodRepository {
  async getAll(): Promise<MoodRecord[]> {
    return db.moodRecords.orderBy('createdAt').reverse().toArray()
  }

  async getById(id: string): Promise<MoodRecord | undefined> {
    return db.moodRecords.get(id)
  }

  async create(input: CreateMoodInput): Promise<MoodRecord> {
    const now = nowISO()
    const record: MoodRecord = {
      id: generateId(),
      date: todayStr(), // 自动设为今天
      level: input.level,
      tags: input.tags ?? [],
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await db.moodRecords.add(record)
    // 异步推送到云端
    syncService.pushOne('mood_records', record as unknown as Record<string, unknown>)
    return record
  }

  async update(id: string, patch: UpdateMoodInput): Promise<MoodRecord> {
    const existing = await db.moodRecords.get(id)
    if (!existing) {
      throw new Error(`MoodRecord not found: ${id}`)
    }
    const updated: MoodRecord = {
      ...existing,
      ...patch,
      updatedAt: nowISO(),
    }
    await db.moodRecords.put(updated)
    // 异步推送到云端
    syncService.pushOne('mood_records', updated as unknown as Record<string, unknown>)
    return updated
  }

  async remove(id: string): Promise<void> {
    await db.moodRecords.delete(id)
    // 异步推送删除标记到云端
    syncService.pushRemove('mood_records', id)
  }
}

export const moodRepository: IMoodRepository = new DexieMoodRepository()
