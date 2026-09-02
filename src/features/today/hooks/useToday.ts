// ============================================================
// useToday Hook
// 订阅三个模块的 store，通过 TodayAggregator 派生出 TodayState
// TodayState 不单独建 store，由 useMemo 实时计算
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { useTodoStore } from '@/features/todo/store'
import { useScheduleStore } from '@/features/schedule/store'
import { useMoodStore } from '@/features/mood/store'
import { buildTodayState } from '../aggregator/TodayAggregator'
import { todayStr } from '@/shared/lib/date'
import type { TodayState } from '../types'
import { millisecondsUntilNextLocalDate } from './todayDate'

export function useToday(date?: string): {
  todayState: TodayState
  date: string
} {
  const [runtimeDate, setRuntimeDate] = useState(todayStr)
  const targetDate = date || runtimeDate

  useEffect(() => {
    if (date) return

    let timer: ReturnType<typeof setTimeout>
    const refreshDate = () => setRuntimeDate(todayStr())
    const scheduleNextRefresh = () => {
      timer = setTimeout(() => {
        refreshDate()
        scheduleNextRefresh()
      }, millisecondsUntilNextLocalDate(new Date()))
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshDate()
    }

    refreshDate()
    scheduleNextRefresh()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [date])

  const todos = useTodoStore((s) => s.todos)
  const events = useScheduleStore((s) => s.events)
  const moods = useMoodStore((s) => s.records)

  const todayState = useMemo(
    () => buildTodayState(targetDate, todos, events, moods),
    [targetDate, todos, events, moods]
  )

  return { todayState, date: targetDate }
}
