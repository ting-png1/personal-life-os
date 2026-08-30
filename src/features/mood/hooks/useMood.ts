// ============================================================
// useMood Hook
// ============================================================

import { useMemo } from 'react'
import { useMoodStore } from '../store'
import { getLatestMoodByDate, hasMoodOnDate, getMoodsByDate } from '../services/moodServices'
import { todayStr } from '@/shared/lib/date'

export function useMood(date?: string) {
  const records = useMoodStore((s) => s.records)
  const loading = useMoodStore((s) => s.loading)
  const error = useMoodStore((s) => s.error)
  const create = useMoodStore((s) => s.create)
  const update = useMoodStore((s) => s.update)
  const remove = useMoodStore((s) => s.remove)
  const loadAll = useMoodStore((s) => s.loadAll)

  const targetDate = date || todayStr()

  const latest = useMemo(
    () => getLatestMoodByDate(records, targetDate),
    [records, targetDate]
  )

  const hasRecorded = useMemo(
    () => hasMoodOnDate(records, targetDate),
    [records, targetDate]
  )

  const todayRecords = useMemo(
    () => getMoodsByDate(records, targetDate),
    [records, targetDate]
  )

  return {
    records,
    latest,
    hasRecorded,
    todayRecords,
    loading,
    error,
    create,
    update,
    remove,
    loadAll,
  }
}
