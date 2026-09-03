// ============================================================
// Health Domain Contract v0
// 平台无关的按日 normalized summary；不包含原始采样或医学推断
// ============================================================

export type HealthDataStatus =
  | 'available'
  | 'unavailable'
  | 'no-data'
  | 'stale'

/** LifeOS 内部来源标识，不对应任何原生平台类型。 */
export interface HealthDataSource {
  readonly id: string
  readonly label: string | null
}

interface HealthMetricMetadata {
  /** 最近一次刷新该 normalized value/status 的 ISO 时间戳。 */
  readonly updatedAt: string
}

/**
 * available/stale 保留 normalized value 及其来源采集时间；
 * no-data 表示来源可用但指定日期没有数据；
 * unavailable 表示当前无法从来源取得数据。
 */
export type DailyHealthMetric<T> =
  | Readonly<
      HealthMetricMetadata & {
        status: 'available' | 'stale'
        value: T
        source: HealthDataSource
        collectedAt: string
      }
    >
  | Readonly<
      HealthMetricMetadata & {
        status: 'no-data'
        value: null
        source: HealthDataSource
        collectedAt: null
      }
    >
  | Readonly<
      HealthMetricMetadata & {
        status: 'unavailable'
        value: null
        source: HealthDataSource | null
        collectedAt: null
      }
    >

export interface DailySleepValue {
  readonly durationMinutes: number
}

export interface DailyRestingHeartRateValue {
  readonly beatsPerMinute: number
}

export interface DailyHeartRateVariabilityValue {
  readonly milliseconds: number
}

export interface DailyStepsValue {
  readonly count: number
}

export interface DailyActivityValue {
  readonly activeMinutes: number
}

/** 指定本地日历日的 normalized Health 摘要；运行时使用，不持久化。 */
export interface DailyHealthSummary {
  readonly date: string // "YYYY-MM-DD"
  readonly sleep: DailyHealthMetric<DailySleepValue>
  readonly restingHeartRate: DailyHealthMetric<DailyRestingHeartRateValue>
  readonly heartRateVariability: DailyHealthMetric<DailyHeartRateVariabilityValue>
  readonly steps: DailyHealthMetric<DailyStepsValue>
  readonly activity: DailyHealthMetric<DailyActivityValue>
}
