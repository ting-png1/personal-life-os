import type { DailyHealthSummary } from '../../health/types.ts'
import type { MoodRecord } from '../../mood/types.ts'
import { buildDailyMood } from '../../mood/services/moodAggregator.ts'
import {
  addDays,
  formatLocalDate,
  parseLocalDate,
} from '../../../shared/lib/date.ts'
import type { LifeTimeline, TimelineDay } from '../types.ts'

export interface BuildTimelineInput {
  startDate: string
  endDate: string
  healthSummaries: DailyHealthSummary[]
  moodRecords: MoodRecord[]
}

function parseTimelineDate(value: string, field: 'startDate' | 'endDate'): Date {
  try {
    const parsed = parseLocalDate(value)

    if (formatLocalDate(parsed) !== value) {
      throw new Error('date does not round-trip')
    }

    return parsed
  } catch {
    throw new Error(`${field} must be a valid local date in YYYY-MM-DD format`)
  }
}

function buildDateSequence(startDate: Date, endDate: Date): string[] {
  const dates: string[] = []

  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    dates.push(formatLocalDate(cursor))
  }

  return dates
}

export function buildTimeline(input: BuildTimelineInput): LifeTimeline {
  const start = parseTimelineDate(input.startDate, 'startDate')
  const end = parseTimelineDate(input.endDate, 'endDate')

  if (start > end) {
    throw new Error('startDate must be on or before endDate')
  }

  const healthByDate = new Map(
    input.healthSummaries.map((summary) => [summary.date, summary]),
  )

  const days: TimelineDay[] = buildDateSequence(start, end).map((date) => ({
    date,
    health: healthByDate.get(date) ?? null,
    mood: buildDailyMood(input.moodRecords, date),
  }))

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    days,
  }
}
