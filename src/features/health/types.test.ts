import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  DailyHealthSummary,
  HealthDataSource,
} from './types.ts'

const normalizedSource = {
  id: 'native-health-provider',
  label: 'Native health provider',
} satisfies HealthDataSource

describe('Health Domain Contract v0', () => {
  it('表达按日 normalized Health 数据及来源时间', () => {
    const summary = {
      date: '2026-09-03',
      sleep: {
        status: 'available',
        value: { durationMinutes: 455 },
        source: normalizedSource,
        collectedAt: '2026-09-03T00:15:00.000Z',
        updatedAt: '2026-09-03T01:00:00.000Z',
      },
      restingHeartRate: {
        status: 'available',
        value: { beatsPerMinute: 58 },
        source: normalizedSource,
        collectedAt: '2026-09-03T00:30:00.000Z',
        updatedAt: '2026-09-03T01:00:00.000Z',
      },
      heartRateVariability: {
        status: 'available',
        value: { milliseconds: 42 },
        source: normalizedSource,
        collectedAt: '2026-09-03T00:30:00.000Z',
        updatedAt: '2026-09-03T01:00:00.000Z',
      },
      steps: {
        status: 'available',
        value: { count: 6840 },
        source: normalizedSource,
        collectedAt: '2026-09-03T00:45:00.000Z',
        updatedAt: '2026-09-03T01:00:00.000Z',
      },
      activity: {
        status: 'available',
        value: { activeMinutes: 37 },
        source: normalizedSource,
        collectedAt: '2026-09-03T00:45:00.000Z',
        updatedAt: '2026-09-03T01:00:00.000Z',
      },
    } satisfies DailyHealthSummary

    assert.equal(summary.date, '2026-09-03')
    assert.equal(summary.sleep.value.durationMinutes, 455)
    assert.equal(summary.steps.value.count, 6840)
    assert.equal(summary.activity.value.activeMinutes, 37)
  })

  it('区分 unavailable、no-data 与保留旧值的 stale', () => {
    const summary = {
      date: '2026-09-03',
      sleep: {
        status: 'unavailable',
        value: null,
        source: null,
        collectedAt: null,
        updatedAt: '2026-09-03T01:00:00.000Z',
      },
      restingHeartRate: {
        status: 'no-data',
        value: null,
        source: normalizedSource,
        collectedAt: null,
        updatedAt: '2026-09-03T01:00:00.000Z',
      },
      heartRateVariability: {
        status: 'stale',
        value: { milliseconds: 39 },
        source: normalizedSource,
        collectedAt: '2026-09-02T00:30:00.000Z',
        updatedAt: '2026-09-03T01:00:00.000Z',
      },
      steps: {
        status: 'no-data',
        value: null,
        source: normalizedSource,
        collectedAt: null,
        updatedAt: '2026-09-03T01:00:00.000Z',
      },
      activity: {
        status: 'unavailable',
        value: null,
        source: normalizedSource,
        collectedAt: null,
        updatedAt: '2026-09-03T01:00:00.000Z',
      },
    } satisfies DailyHealthSummary

    assert.equal(summary.sleep.status, 'unavailable')
    assert.equal(summary.restingHeartRate.status, 'no-data')
    assert.equal(summary.heartRateVariability.status, 'stale')
    assert.equal(summary.heartRateVariability.value.milliseconds, 39)
  })
})
