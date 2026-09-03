import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CurrentCycleState } from '../../cycle/types.ts'
import type { DailyHealthSummary } from '../../health/types.ts'
import type { TodayState } from '../../today/types.ts'
import {
  buildLifeState,
  resolveLifeStateSource,
} from './LifeStateComposer.ts'

describe('Life State Boundary Contract v0', () => {
  it('只装配已有的 Today / Cycle / Health 派生输入', () => {
    const today = {} as TodayState
    const cycle = {} as CurrentCycleState
    const health = {} as DailyHealthSummary

    const result = buildLifeState({
      asOf: '2026-09-03T01:00:00.000Z',
      today: { readiness: 'ready', value: today },
      cycle: { readiness: 'ready', value: cycle },
      health: { readiness: 'ready', value: health },
    })

    assert.equal(result.asOf, '2026-09-03T01:00:00.000Z')
    assert.equal(result.sources.today.readiness, 'ready')
    assert.equal(result.sources.today.value, today)
    assert.equal(result.sources.cycle.readiness, 'ready')
    assert.equal(result.sources.cycle.value, cycle)
    assert.equal(result.sources.health.readiness, 'ready')
    assert.equal(result.sources.health.value, health)
  })

  it('未就绪来源保持为空，不制造派生数据', () => {
    const untrustedToday = {} as TodayState
    const untrustedCycle = {} as CurrentCycleState
    const untrustedHealth = {} as DailyHealthSummary

    const result = buildLifeState({
      asOf: '2026-09-03T01:00:00.000Z',
      today: resolveLifeStateSource(false, untrustedToday),
      cycle: resolveLifeStateSource(false, untrustedCycle),
      health: resolveLifeStateSource(false, untrustedHealth),
    })

    assert.deepEqual(result.sources, {
      today: { readiness: 'not-ready', value: null },
      cycle: { readiness: 'not-ready', value: null },
      health: { readiness: 'not-ready', value: null },
    })
  })

  it('已就绪来源原样传递既有派生状态', () => {
    const today = {} as TodayState
    const cycle = {} as CurrentCycleState
    const health = {} as DailyHealthSummary

    assert.deepEqual(resolveLifeStateSource(true, today), {
      readiness: 'ready',
      value: today,
    })
    assert.deepEqual(resolveLifeStateSource(true, cycle), {
      readiness: 'ready',
      value: cycle,
    })
    assert.deepEqual(resolveLifeStateSource(true, health), {
      readiness: 'ready',
      value: health,
    })
  })

  it('区分 Health 尚未加载与该日确实没有记录', () => {
    const notReady = resolveLifeStateSource<DailyHealthSummary | null>(false, null)
    const loadedWithoutRecord = resolveLifeStateSource<DailyHealthSummary | null>(true, null)

    assert.deepEqual(notReady, { readiness: 'not-ready', value: null })
    assert.deepEqual(loadedWithoutRecord, { readiness: 'ready', value: null })
  })
})
