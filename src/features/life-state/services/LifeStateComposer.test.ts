import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CurrentCycleState } from '../../cycle/types.ts'
import type { TodayState } from '../../today/types.ts'
import { buildLifeState } from './LifeStateComposer.ts'

describe('Life State Boundary Contract v0', () => {
  it('只装配已有的 Today / Cycle 派生输入', () => {
    const today = {} as TodayState
    const cycle = {} as CurrentCycleState

    const result = buildLifeState({
      asOf: '2026-09-03T01:00:00.000Z',
      today: { readiness: 'ready', value: today },
      cycle: { readiness: 'ready', value: cycle },
    })

    assert.equal(result.asOf, '2026-09-03T01:00:00.000Z')
    assert.equal(result.sources.today.readiness, 'ready')
    assert.equal(result.sources.today.value, today)
    assert.equal(result.sources.cycle.readiness, 'ready')
    assert.equal(result.sources.cycle.value, cycle)
  })

  it('未就绪来源保持为空，不制造派生数据', () => {
    const result = buildLifeState({
      asOf: '2026-09-03T01:00:00.000Z',
      today: { readiness: 'not-ready', value: null },
      cycle: { readiness: 'not-ready', value: null },
    })

    assert.deepEqual(result.sources, {
      today: { readiness: 'not-ready', value: null },
      cycle: { readiness: 'not-ready', value: null },
    })
  })
})
