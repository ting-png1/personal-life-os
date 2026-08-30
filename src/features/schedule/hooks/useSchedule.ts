// ============================================================
// useSchedule Hook
// ============================================================

import { useMemo } from 'react'
import { useScheduleStore } from '../store'
import { expandEventsForDate, getCurrentInstance, getNextInstance } from '../services/ScheduleExpander'
import { todayStr } from '@/shared/lib/date'

export function useSchedule(date?: string) {
  const events = useScheduleStore((s) => s.events)
  const loading = useScheduleStore((s) => s.loading)
  const error = useScheduleStore((s) => s.error)
  const create = useScheduleStore((s) => s.create)
  const update = useScheduleStore((s) => s.update)
  const remove = useScheduleStore((s) => s.remove)
  const loadAll = useScheduleStore((s) => s.loadAll)

  const targetDate = date || todayStr()

  const todayInstances = useMemo(
    () => expandEventsForDate(events, targetDate),
    [events, targetDate]
  )

  const currentInstance = useMemo(
    () => getCurrentInstance(todayInstances),
    [todayInstances]
  )

  const nextInstance = useMemo(
    () => getNextInstance(todayInstances),
    [todayInstances]
  )

  return {
    events,
    todayInstances,
    currentInstance,
    nextInstance,
    loading,
    error,
    create,
    update,
    remove,
    loadAll,
  }
}
