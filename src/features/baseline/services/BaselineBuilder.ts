import {
  addDays,
  formatLocalDate,
  parseLocalDate,
} from '../../../shared/lib/date.ts'
import type { TimelineDay, LifeTimeline } from '../../timeline/types.ts'
import type {
  PersonalBaseline,
  PersonalMetricTrend,
  TrendDirection,
} from '../types.ts'

export const BASELINE_LOOKBACK_DAYS = 14
export const BASELINE_MINIMUM_SAMPLES = 7

type HealthMetric =
  | 'sleepDurationMinutes'
  | 'restingHeartRate'
  | 'hrvMilliseconds'

function parseAnchorDate(value: string): Date {
  try {
    const parsed = parseLocalDate(value)

    if (formatLocalDate(parsed) !== value) {
      throw new Error('date does not round-trip')
    }

    return parsed
  } catch {
    throw new Error('anchorDate must be a valid local date in YYYY-MM-DD format')
  }
}

function availableHealthValue(
  day: TimelineDay | undefined,
  metric: HealthMetric,
): number | null {
  const health = day?.health

  if (health === null || health === undefined) {
    return null
  }

  switch (metric) {
    case 'sleepDurationMinutes':
      return health.sleep.status === 'available'
        ? health.sleep.value.durationMinutes
        : null
    case 'restingHeartRate':
      return health.restingHeartRate.status === 'available'
        ? health.restingHeartRate.value.beatsPerMinute
        : null
    case 'hrvMilliseconds':
      return health.heartRateVariability.status === 'available'
        ? health.heartRateVariability.value.milliseconds
        : null
  }
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function directionFor(delta: number): TrendDirection {
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

function buildMetricTrend(
  samples: number[],
  currentValue: number | null,
): PersonalMetricTrend {
  if (samples.length < BASELINE_MINIMUM_SAMPLES) {
    return {
      status: 'insufficient-data',
      sampleCount: samples.length,
      baselineAverage: null,
      currentValue,
      delta: null,
      direction: null,
    }
  }

  const baselineAverage = average(samples)

  if (currentValue === null) {
    return {
      status: 'current-unavailable',
      sampleCount: samples.length,
      baselineAverage,
      currentValue: null,
      delta: null,
      direction: null,
    }
  }

  const delta = currentValue - baselineAverage

  return {
    status: 'ready',
    sampleCount: samples.length,
    baselineAverage,
    currentValue,
    delta,
    direction: directionFor(delta),
  }
}

function valuesForWindow(
  days: TimelineDay[],
  readValue: (day: TimelineDay) => number | null,
): number[] {
  return days.flatMap((day) => {
    const value = readValue(day)
    return value === null ? [] : [value]
  })
}

export function buildPersonalBaseline(
  timeline: LifeTimeline,
  anchorDate: string,
): PersonalBaseline {
  const anchor = parseAnchorDate(anchorDate)
  const windowEndDate = formatLocalDate(addDays(anchor, -1))
  const windowStartDate = formatLocalDate(
    addDays(anchor, -BASELINE_LOOKBACK_DAYS),
  )
  const windowDays = timeline.days.filter(
    (day) => day.date >= windowStartDate && day.date <= windowEndDate,
  )
  const currentDay = timeline.days.find((day) => day.date === anchorDate)

  const healthTrend = (metric: HealthMetric): PersonalMetricTrend =>
    buildMetricTrend(
      valuesForWindow(windowDays, (day) => availableHealthValue(day, metric)),
      availableHealthValue(currentDay, metric),
    )

  const moodTrend = buildMetricTrend(
    valuesForWindow(windowDays, (day) => day.mood.averageLevel),
    currentDay?.mood.averageLevel ?? null,
  )

  return {
    anchorDate,
    window: {
      startDate: windowStartDate,
      endDate: windowEndDate,
      lookbackDays: BASELINE_LOOKBACK_DAYS,
      minimumSamples: BASELINE_MINIMUM_SAMPLES,
    },
    health: {
      sleepDurationMinutes: healthTrend('sleepDurationMinutes'),
      restingHeartRate: healthTrend('restingHeartRate'),
      hrvMilliseconds: healthTrend('hrvMilliseconds'),
    },
    mood: {
      averageLevel: moodTrend,
    },
  }
}
