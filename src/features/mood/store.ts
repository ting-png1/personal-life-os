// ============================================================
// Mood Zustand Store
// ============================================================

import { create } from 'zustand'
import { moodRepository } from './repository'
import type { MoodRecord, CreateMoodInput, UpdateMoodInput } from './types'

interface MoodState {
  records: MoodRecord[]
  loading: boolean
  error: string | null

  loadAll: () => Promise<void>
  create: (input: CreateMoodInput) => Promise<MoodRecord>
  update: (id: string, patch: UpdateMoodInput) => Promise<MoodRecord>
  remove: (id: string) => Promise<void>
}

export const useMoodStore = create<MoodState>((set) => ({
  records: [],
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null })
    try {
      const records = await moodRepository.getAll()
      set({ records, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '加载失败' })
    }
  },

  create: async (input) => {
    const record = await moodRepository.create(input)
    set((state) => ({
      records: [record, ...state.records],
    }))
    return record
  },

  update: async (id, patch) => {
    const updated = await moodRepository.update(id, patch)
    set((state) => ({
      records: state.records.map((r) => (r.id === id ? updated : r)),
    }))
    return updated
  },

  remove: async (id) => {
    await moodRepository.remove(id)
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
    }))
  },
}))
