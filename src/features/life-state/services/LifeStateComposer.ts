// ============================================================
// LifeStateComposer — 纯函数边界
// 不依赖 Store / Repository / Dexie，不执行领域聚合或跨日查询
// ============================================================

import type { LifeState, LifeStateInput, LifeStateSource } from '../types.ts'

export function resolveLifeStateSource<T>(
  ready: boolean,
  value: T
): LifeStateSource<T> {
  return ready
    ? { readiness: 'ready', value }
    : { readiness: 'not-ready', value: null }
}

export function buildLifeState(input: LifeStateInput): LifeState {
  return {
    asOf: input.asOf,
    sources: {
      today: { ...input.today },
      cycle: { ...input.cycle },
      health: { ...input.health },
    },
  }
}
