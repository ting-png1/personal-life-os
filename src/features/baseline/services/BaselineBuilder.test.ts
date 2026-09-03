import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { DailyHealthSummary, HealthDataSource } from '../../health/types.ts'
import type { DailyMoodResult } from '../../mood/services/moodAggregator.ts'
import type { LifeTimeline, TimelineDay } from '../../timeline/types.ts'
import { addDays, formatLocalDate, parseLocalDate } from '../../../shared/lib/date.ts'
import {
  BASELINE_LOOKBACK_DAYS,
  BASELINE_MINIMUM_SAMPLES,
  buildPersonalBaseline,
} from './BaselineBuilder.ts'
import { loadPersonalBaseline } from './loadPersonalBaseline.ts'

process.env.TZ = 'Asia/Shanghai'

const source = {
  id: 'test-health-source',
  label: 'Test Health Source',
} satisfies HealthDataSource

function availableMetric<T>(value: T) {
  return {
    status: 'available' as const,
    value,
    source,
    collectedAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:05:00.000Z',
  }
}

function staleMetric<T>(value: T) {
  return {
    status: 'stale' as const,
    value,
    source,
    collectedAt: '2026-08-31T12:00:00.000Z',
    updatedAt: '2026-09-01T12:05:00.000Z',
  }
}

function makeHealth(
  date: string,
  sleepMinutes: number,
  sleepStatus: 'available' | 'stale' = 'available',
): DailyHealthSummary {
  return {
    date,
    sleep:
      sleepStatus === 'available'
        ? availableMetric({ durationMinutes: sleepMinutes })
        : staleMetric({ durationMinutes: sleepMinutes }),
    restingHeartRate: availableMetric({ beatsPerMinute: 60 }),
    heartRateVariability: availableMetric({ milliseconds: 40 }),
    steps: availableMetric({ count: 7000 }),
    activity: availableMetric({ activeMinutes: 30 }),
  }
}

function makeMood(date: string, averageLevel: number | null): DailyMoodResult {
  return {
    date,
    averageLevel,
    dominantLevel: averageLevel === null ? null : 3,
    roundedLevel: averageLevel === null ? null : 3,
    moodRange: 0,
    eventCount: averageLevel === null ? 0 : 1,
    timeCoverage: averageLevel === null ? [] : ['afternoon'],
    sufficiency: averageLevel === null ? 'unknown' : 'single_record',
    summary: '',
  }
}

function dateFrom(anchorDate: string, offset: number): string {
  return formatLocalDate(addDays(parseLocalDate(anchorDate), offset))
}

function makeDay(
  date: string,
  health: DailyHealthSummary | null,
  moodAverage: number | null,
): TimelineDay {
  return {
    date,
    health,
    mood: makeMood(date, moodAverage),
  }
}

function makeTimeline(days: TimelineDay[]): LifeTimeline {
  return {
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    days,
  }
}

describe('BaselineBuilder', () => {
  it('使用锚点日前 14 天，并按指标独立要求至少 7 个有效日样本', () => {
    const anchor = '2026-09-03'
    const days: TimelineDay[] = []

    for (let offset = -14; offset <= -1; offset += 1) {
      const date = dateFrom(anchor, offset)
      const sampleIndex = offset + 14
      days.push(
        makeDay(
          date,
          makeHealth(date, sampleIndex < 7 ? 100 + sampleIndex : 999, sampleIndex < 7 ? 'available' : 'stale'),
          sampleIndex < 7 ? 3 : null,
        ),
      )
    }

    days.unshift(
      makeDay(
        dateFrom(anchor, -15),
        makeHealth(dateFrom(anchor, -15), 1000),
        5,
      ),
    )
    days.push(makeDay(anchor, makeHealth(anchor, 110), 4))

    const result = buildPersonalBaseline(makeTimeline(days), anchor)

    assert.deepEqual(result.window, {
      startDate: '2026-08-20',
      endDate: '2026-09-02',
      lookbackDays: BASELINE_LOOKBACK_DAYS,
      minimumSamples: BASELINE_MINIMUM_SAMPLES,
    })
    assert.deepEqual(result.health.sleepDurationMinutes, {
      status: 'ready',
      sampleCount: 7,
      baselineAverage: 103,
      currentValue: 110,
      delta: 7,
      direction: 'up',
    })
    assert.equal(result.health.restingHeartRate.status, 'ready')
    assert.equal(result.health.restingHeartRate.sampleCount, 14)
    assert.deepEqual(result.mood.averageLevel, {
      status: 'ready',
      sampleCount: 7,
      baselineAverage: 3,
      currentValue: 4,
      delta: 1,
      direction: 'up',
    })
  })

  it('有效样本不足时明确返回 insufficient-data，不产生基线或趋势', () => {
    const anchor = '2026-09-03'
    const days = Array.from({ length: 6 }, (_, index) => {
      const date = dateFrom(anchor, index - 6)
      return makeDay(date, makeHealth(date, 420), null)
    })
    days.push(makeDay(anchor, makeHealth(anchor, 400), null))

    const result = buildPersonalBaseline(makeTimeline(days), anchor)

    assert.deepEqual(result.health.sleepDurationMinutes, {
      status: 'insufficient-data',
      sampleCount: 6,
      baselineAverage: null,
      currentValue: 400,
      delta: null,
      direction: null,
    })
    assert.equal(result.mood.averageLevel.status, 'insufficient-data')
  })

  it('不把 stale Health 当作有效当前值，并保留已建立的个人基线', () => {
    const anchor = '2026-09-03'
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = dateFrom(anchor, index - 7)
      return makeDay(date, makeHealth(date, 450), 3)
    })
    days.push(makeDay(anchor, makeHealth(anchor, 430, 'stale'), 3))

    const result = buildPersonalBaseline(makeTimeline(days), anchor)

    assert.deepEqual(result.health.sleepDurationMinutes, {
      status: 'current-unavailable',
      sampleCount: 7,
      baselineAverage: 450,
      currentValue: null,
      delta: null,
      direction: null,
    })
    assert.equal(result.mood.averageLevel.direction, 'flat')
  })

  it('读取入口只请求 baseline 闭环需要的日期范围', async () => {
    const requestedRanges: Array<[string, string]> = []
    const result = await loadPersonalBaseline('2026-09-03', {
      health: {
        async getByDateRange(startDate, endDate) {
          requestedRanges.push([startDate, endDate])
          return []
        },
      },
      mood: {
        async getAll() {
          return []
        },
      },
    })

    assert.deepEqual(requestedRanges, [['2026-08-20', '2026-09-03']])
    assert.equal(result.health.sleepDurationMinutes.status, 'insufficient-data')
    assert.equal(result.mood.averageLevel.status, 'insufficient-data')
  })
})
