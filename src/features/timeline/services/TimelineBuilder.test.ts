import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { DailyHealthSummary, HealthDataSource } from '../../health/types.ts'
import type { MoodRecord } from '../../mood/types.ts'
import { buildTimeline } from './TimelineBuilder.ts'
import { loadTimeline } from './loadTimeline.ts'

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
    collectedAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-02T12:05:00.000Z',
  }
}

function makeHealth(date: string): DailyHealthSummary {
  return {
    date,
    sleep: availableMetric({ durationMinutes: 450 }),
    restingHeartRate: availableMetric({ beatsPerMinute: 58 }),
    heartRateVariability: availableMetric({ milliseconds: 42 }),
    steps: availableMetric({ count: 7000 }),
    activity: availableMetric({ activeMinutes: 35 }),
  }
}

function makeMood(id: string, date: string, level: 1 | 2 | 3 | 4 | 5): MoodRecord {
  return {
    id,
    date,
    level,
    tags: [],
    note: null,
    createdAt: `${date}T12:00:00+08:00`,
    updatedAt: `${date}T12:00:00+08:00`,
  }
}

describe('TimelineBuilder', () => {
  it('按本地日期顺序组合原始 Health summary 与既有 Daily Mood 派生结果', () => {
    const health = makeHealth('2026-09-02')
    const timeline = buildTimeline({
      startDate: '2026-09-01',
      endDate: '2026-09-03',
      healthSummaries: [health],
      moodRecords: [
        makeMood('mood-1', '2026-09-01', 2),
        makeMood('mood-2', '2026-09-01', 4),
      ],
    })

    assert.deepEqual(
      timeline.days.map((day) => day.date),
      ['2026-09-01', '2026-09-02', '2026-09-03'],
    )
    assert.equal(timeline.days[0].health, null)
    assert.equal(timeline.days[1].health, health)
    assert.equal(timeline.days[0].mood.averageLevel, 3)
    assert.equal(timeline.days[0].mood.eventCount, 2)
    assert.equal(timeline.days[2].mood.sufficiency, 'unknown')
  })

  it('拒绝无效或反向日期范围', () => {
    assert.throws(
      () =>
        buildTimeline({
          startDate: '2026-09-03',
          endDate: '2026-09-01',
          healthSummaries: [],
          moodRecords: [],
        }),
      /startDate must be on or before endDate/,
    )

    assert.throws(
      () =>
        buildTimeline({
          startDate: '2026-02-30',
          endDate: '2026-03-01',
          healthSummaries: [],
          moodRecords: [],
        }),
      /startDate must be a valid local date/,
    )
  })

  it('通过既有 Repository 能力并行读取，不创建 Timeline 持久化 owner', async () => {
    const health = makeHealth('2026-09-02')
    const requestedRanges: Array<[string, string]> = []

    const timeline = await loadTimeline(
      { startDate: '2026-09-01', endDate: '2026-09-02' },
      {
        health: {
          async getByDateRange(startDate, endDate) {
            requestedRanges.push([startDate, endDate])
            return [health]
          },
        },
        mood: {
          async getAll() {
            return [makeMood('mood-1', '2026-09-01', 4)]
          },
        },
      },
    )

    assert.deepEqual(requestedRanges, [['2026-09-01', '2026-09-02']])
    assert.equal(timeline.days[0].mood.averageLevel, 4)
    assert.equal(timeline.days[1].health, health)
  })
})
