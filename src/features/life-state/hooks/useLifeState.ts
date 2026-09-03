import { useMemo } from 'react'
import { useToday } from '@/features/today/hooks/useToday'
import { useCycle } from '@/features/cycle/hooks/useCycle'
import { useDailyHealth } from '@/features/health/hooks/useDailyHealth'
import { nowISO } from '@/shared/lib/date'
import {
  buildLifeState,
  resolveLifeStateSource,
} from '../services/LifeStateComposer'
import type { LifeState } from '../types'

/**
 * 组合当前日期的既有 Today / Cycle / Health 派生状态。
 * Life State 本身不订阅原始数据源，也不执行领域计算或持久化。
 */
export function useLifeState(date?: string): LifeState {
  const {
    todayState,
    date: targetDate,
    ready: todayReady,
  } = useToday(date)
  const {
    currentCycleState,
    hydrated: cycleReady,
  } = useCycle(targetDate)
  const {
    summary: healthSummary,
    ready: healthReady,
  } = useDailyHealth(targetDate)

  return useMemo(
    () => buildLifeState({
      asOf: nowISO(),
      today: resolveLifeStateSource(todayReady, todayState),
      cycle: resolveLifeStateSource(cycleReady, currentCycleState),
      health: resolveLifeStateSource(healthReady, healthSummary),
    }),
    [
      todayReady,
      todayState,
      cycleReady,
      currentCycleState,
      healthReady,
      healthSummary,
    ]
  )
}
