import type { DailyHealthSummary } from '../health/types.ts'
import type { DailyMoodResult } from '../mood/services/moodAggregator.ts'

export interface TimelineDay {
  date: string
  health: DailyHealthSummary | null
  mood: DailyMoodResult
}

export interface LifeTimeline {
  startDate: string
  endDate: string
  days: TimelineDay[]
}
