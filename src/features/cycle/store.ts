// ============================================================
// Cycle Zustand Store
// ============================================================

import { create } from 'zustand'
import { cycleRepository } from './repository'
import type { PeriodRecord, CreatePeriodInput, UpdatePeriodInput } from './types'

interface CycleState {
  records: PeriodRecord[]
  loading: boolean
  hydrated: boolean
  error: string | null

  loadAll: () => Promise<void>
  create: (input: CreatePeriodInput) => Promise<PeriodRecord>
  update: (id: string, patch: UpdatePeriodInput) => Promise<PeriodRecord>
  remove: (id: string) => Promise<void>
}

export const useCycleStore = create<CycleState>((set) => ({
  records: [],
  loading: false,
  hydrated: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null })
    try {
      const records = await cycleRepository.getAll()
      set({ records, loading: false, hydrated: true })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '加载失败' })
    }
  },

  create: async (input) => {
    const record = await cycleRepository.create(input)
    set((state) => ({
      records: [record, ...state.records].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      ),
    }))
    return record
  },

  update: async (id, patch) => {
    const updated = await cycleRepository.update(id, patch)
    set((state) => ({
      records: state.records.map((r) => (r.id === id ? updated : r)),
    }))
    return updated
  },

  remove: async (id) => {
    await cycleRepository.remove(id)
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
    }))
  },
}))
