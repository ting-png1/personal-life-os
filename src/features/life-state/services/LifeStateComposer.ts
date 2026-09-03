// ============================================================
// LifeStateComposer — 纯函数边界
// 不依赖 Store / Repository / Dexie，不执行领域聚合或跨日查询
// ============================================================

import type { LifeState, LifeStateInput } from '../types.ts'

export function buildLifeState(input: LifeStateInput): LifeState {
  return {
    asOf: input.asOf,
    sources: {
      today: { ...input.today },
      cycle: { ...input.cycle },
    },
  }
}
