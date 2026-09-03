export type TrendDirection = 'up' | 'down' | 'flat'

export type PersonalMetricTrend =
  | {
      status: 'insufficient-data'
      sampleCount: number
      baselineAverage: null
      currentValue: number | null
      delta: null
      direction: null
    }
  | {
      status: 'current-unavailable'
      sampleCount: number
      baselineAverage: number
      currentValue: null
      delta: null
      direction: null
    }
  | {
      status: 'ready'
      sampleCount: number
      baselineAverage: number
      currentValue: number
      delta: number
      direction: TrendDirection
    }

export interface PersonalBaseline {
  anchorDate: string
  window: {
    startDate: string
    endDate: string
    lookbackDays: number
    minimumSamples: number
  }
  health: {
    sleepDurationMinutes: PersonalMetricTrend
    restingHeartRate: PersonalMetricTrend
    hrvMilliseconds: PersonalMetricTrend
  }
  mood: {
    averageLevel: PersonalMetricTrend
  }
}
