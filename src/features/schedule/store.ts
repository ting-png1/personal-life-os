// ============================================================
// Schedule Zustand Store
// ============================================================

import { create } from 'zustand'
import { scheduleRepository } from './repository'
import type { ScheduleEvent, CreateScheduleInput, UpdateScheduleInput } from './types'

interface ScheduleState {
  events: ScheduleEvent[]
  loading: boolean
  error: string | null

  loadAll: () => Promise<void>
  create: (input: CreateScheduleInput) => Promise<ScheduleEvent>
  update: (id: string, patch: UpdateScheduleInput) => Promise<ScheduleEvent>
  remove: (id: string) => Promise<void>
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  events: [],
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null })
    try {
      const events = await scheduleRepository.getAll()
      set({ events, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '加载失败' })
    }
  },

  create: async (input) => {
    const event = await scheduleRepository.create(input)
    set((state) => ({
      events: [...state.events, event].sort(
        (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      ),
    }))
    return event
  },

  update: async (id, patch) => {
    const updated = await scheduleRepository.update(id, patch)
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? updated : e)),
    }))
    return updated
  },

  remove: async (id) => {
    await scheduleRepository.remove(id)
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }))
  },
}))
