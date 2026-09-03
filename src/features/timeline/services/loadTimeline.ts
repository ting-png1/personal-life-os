import type { IHealthRepository } from '../../health/repository.ts'
import type { MoodRecord } from '../../mood/types.ts'
import { buildTimeline } from './TimelineBuilder.ts'
import type { LifeTimeline } from '../types.ts'

interface MoodTimelineSource {
  getAll(): Promise<MoodRecord[]>
}

export interface TimelineSources {
  health: Pick<IHealthRepository, 'getByDateRange'>
  mood: MoodTimelineSource
}

export interface TimelineRange {
  startDate: string
  endDate: string
}

/**
 * Read-only composition boundary for Timeline facts.
 * Callers provide the existing repositories; Timeline never owns persistence.
 */
export async function loadTimeline(
  range: TimelineRange,
  sources: TimelineSources,
): Promise<LifeTimeline> {
  const [healthSummaries, moodRecords] = await Promise.all([
    sources.health.getByDateRange(range.startDate, range.endDate),
    sources.mood.getAll(),
  ])

  return buildTimeline({
    ...range,
    healthSummaries,
    moodRecords,
  })
}
