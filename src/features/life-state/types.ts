// ============================================================
// Life State Boundary Contract v0
// 仅组合已有派生状态；不聚合原始数据、不持久化
// ============================================================

import type { TodayState } from '@/features/today/types'
import type { CurrentCycleState } from '@/features/cycle/types'

export type LifeStateSource<T> =
  | Readonly<{
      readiness: 'not-ready'
      value: null
    }>
  | Readonly<{
      readiness: 'ready'
      value: T
    }>

export interface LifeStateInput {
  /** 生成边界对象时的 ISO 时间戳。 */
  asOf: string
  today: LifeStateSource<TodayState>
  cycle: LifeStateSource<CurrentCycleState>
}

export interface LifeState {
  asOf: string
  sources: Readonly<{
    today: LifeStateSource<TodayState>
    cycle: LifeStateSource<CurrentCycleState>
  }>
}
