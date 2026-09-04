// ============================================================
// Schedule Repository
// ============================================================

import { db } from '@/data/database'
import { generateId } from '@/shared/lib/id'
import { nowISO } from '@/shared/lib/date'
import { commitLocalCreate, commitLocalDelete, commitLocalUpsert } from '@/features/sync/v1/localMutation'
import type { ScheduleEvent, CreateScheduleInput, UpdateScheduleInput } from './types'
import { getScheduleValidationError } from './services/scheduleValidation'

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
    const validationError = getScheduleValidationError(event)
    if (validationError) throw new Error(validationError)
    await commitLocalCreate('schedule', event, now)
    return event
  }

  async update(id: string, patch: UpdateScheduleInput): Promise<ScheduleEvent> {
    const existing = await db.scheduleEvents.get(id)
    if (!existing) {
      throw new Error(`ScheduleEvent not found: ${id}`)
    }

    const merged = { ...existing, ...patch }
    const updated: ScheduleEvent = {
      ...merged,
      updatedAt: nowISO(),
    }
    const validationError = getScheduleValidationError(updated)
    if (validationError) throw new Error(validationError)
    await commitLocalUpsert('schedule', updated, updated.updatedAt)
    return updated
  }

  async remove(id: string): Promise<void> {
    await commitLocalDelete('schedule', id, nowISO())
  }
}

export const scheduleRepository: IScheduleRepository = new DexieScheduleRepository()
