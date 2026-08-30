// ============================================================
// Schedule Repository
// ============================================================

import { db } from '@/data/database'
import { generateId } from '@/shared/lib/id'
import { nowISO } from '@/shared/lib/date'
import { syncService } from '@/features/sync/SyncService'
import type { ScheduleEvent, CreateScheduleInput, UpdateScheduleInput } from './types'

export interface IScheduleRepository {
  getAll(): Promise<ScheduleEvent[]>
  getById(id: string): Promise<ScheduleEvent | undefined>
  create(input: CreateScheduleInput): Promise<ScheduleEvent>
  update(id: string, patch: UpdateScheduleInput): Promise<ScheduleEvent>
  remove(id: string): Promise<void>
}

class DexieScheduleRepository implements IScheduleRepository {
  async getAll(): Promise<ScheduleEvent[]> {
    return db.scheduleEvents.orderBy('startDateTime').toArray()
  }

  async getById(id: string): Promise<ScheduleEvent | undefined> {
    return db.scheduleEvents.get(id)
  }

  async create(input: CreateScheduleInput): Promise<ScheduleEvent> {
    // 校验：endDateTime 必须晚于 startDateTime
    if (new Date(input.endDateTime) <= new Date(input.startDateTime)) {
      throw new Error('endDateTime 必须晚于 startDateTime')
    }

    const now = nowISO()
    const event: ScheduleEvent = {
      id: generateId(),
      title: input.title.trim(),
      type: input.type,
      location: input.location ?? null,
      note: input.note ?? null,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      recurrence: input.recurrence ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await db.scheduleEvents.add(event)
    // 异步推送到云端
    syncService.pushOne('schedule_events', event as unknown as Record<string, unknown>)
    return event
  }

  async update(id: string, patch: UpdateScheduleInput): Promise<ScheduleEvent> {
    const existing = await db.scheduleEvents.get(id)
    if (!existing) {
      throw new Error(`ScheduleEvent not found: ${id}`)
    }

    const merged = { ...existing, ...patch }
    // 校验时间
    if (new Date(merged.endDateTime) <= new Date(merged.startDateTime)) {
      throw new Error('endDateTime 必须晚于 startDateTime')
    }

    const updated: ScheduleEvent = {
      ...merged,
      updatedAt: nowISO(),
    }
    await db.scheduleEvents.put(updated)
    // 异步推送到云端
    syncService.pushOne('schedule_events', updated as unknown as Record<string, unknown>)
    return updated
  }

  async remove(id: string): Promise<void> {
    await db.scheduleEvents.delete(id)
    // 异步推送删除标记到云端
    syncService.pushRemove('schedule_events', id)
  }
}

export const scheduleRepository: IScheduleRepository = new DexieScheduleRepository()
