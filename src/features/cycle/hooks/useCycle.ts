// ============================================================
// useCycle Hook
// 组合 store + CycleCalculator 纯函数，提供给组件的便捷接口
// ============================================================

import { useMemo } from 'react'
import { useCycleStore } from '../store'
import {
  buildCurrentCycleState,
  buildCycleStatsList,
} from '../services/CycleCalculator'
import { todayStr } from '@/shared/lib/date'
import type { CurrentCycleState, CycleStats } from '../types'

export function useCycle(date?: string) {
  const records = useCycleStore((s) => s.records)
  const loading = useCycleStore((s) => s.loading)
  const hydrated = useCycleStore((s) => s.hydrated)
  const error = useCycleStore((s) => s.error)
  const create = useCycleStore((s) => s.create)
  const update = useCycleStore((s) => s.update)
  const remove = useCycleStore((s) => s.remove)
  const loadAll = useCycleStore((s) => s.loadAll)

  const targetDate = date || todayStr()

  const currentCycleState: CurrentCycleState = useMemo(
    () => buildCurrentCycleState(records, targetDate),
    [records, targetDate]
  )

  const cycleStats: CycleStats[] = useMemo(
    () => buildCycleStatsList(records),
    [records]
  )

  return {
    records,
    loading,
    hydrated,
    error,
    create,
    update,
    remove,
    loadAll,
    currentCycleState,
    cycleStats,
  }
}
