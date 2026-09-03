import {
  healthRepository,
  type IHealthRepository,
} from './repository.ts'
import type {
  DailyActivityValue,
  DailyHealthMetric,
  DailyHealthSummary,
  DailyHeartRateVariabilityValue,
  DailyRestingHeartRateValue,
  DailySleepValue,
  DailyStepsValue,
  HealthDataSource,
} from './types.ts'

type UnknownObject = Record<string, unknown>

export class HealthImportValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HealthImportValidationError'
  }
}

function fail(path: string, message: string): never {
  throw new HealthImportValidationError(`${path}: ${message}`)
}

function readObject(value: unknown, path: string): UnknownObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'expected object')
  }
  return value as UnknownObject
}

function assertOnlyKeys(
  value: UnknownObject,
  keys: readonly string[],
  path: string
): void {
  const allowed = new Set(keys)
  const unexpected = Object.keys(value).find((key) => !allowed.has(key))
  if (unexpected) fail(`${path}.${unexpected}`, 'unexpected field')
}

function readIsoInstant(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    return fail(path, 'expected ISO timestamp with timezone')
  }
  return value
}

function readLocalDate(value: unknown, path: string): string {
  if (typeof value !== 'string') return fail(path, 'expected YYYY-MM-DD')
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return fail(path, 'expected YYYY-MM-DD')

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return fail(path, 'invalid calendar date')
  }
  return value
}

function readSource(value: unknown, path: string): HealthDataSource {
  const source = readObject(value, path)
  assertOnlyKeys(source, ['id', 'label'], path)
  if (typeof source.id !== 'string' || source.id.trim() === '') {
    return fail(`${path}.id`, 'expected non-empty string')
  }
  if (source.label !== null && typeof source.label !== 'string') {
    return fail(`${path}.label`, 'expected string or null')
  }
  return { id: source.id, label: source.label }
}

function readNonNegativeNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fail(path, 'expected non-negative finite number')
  }
  return value
}

function readSingleValue<K extends string>(
  value: unknown,
  key: K,
  path: string,
  integer = false
): Record<K, number> {
  const object = readObject(value, path)
  assertOnlyKeys(object, [key], path)
  const numberValue = readNonNegativeNumber(object[key], `${path}.${key}`)
  if (integer && !Number.isInteger(numberValue)) {
    return fail(`${path}.${key}`, 'expected integer')
  }
  return { [key]: numberValue } as Record<K, number>
}

function readMetric<T>(
  value: unknown,
  path: string,
  readValue: (value: unknown, path: string) => T
): DailyHealthMetric<T> {
  const metric = readObject(value, path)
  assertOnlyKeys(
    metric,
    ['status', 'value', 'source', 'collectedAt', 'updatedAt'],
    path
  )
  const updatedAt = readIsoInstant(metric.updatedAt, `${path}.updatedAt`)

  if (metric.status === 'available' || metric.status === 'stale') {
    return {
      status: metric.status,
      value: readValue(metric.value, `${path}.value`),
      source: readSource(metric.source, `${path}.source`),
      collectedAt: readIsoInstant(metric.collectedAt, `${path}.collectedAt`),
      updatedAt,
    }
  }

  if (metric.status === 'no-data') {
    if (metric.value !== null) fail(`${path}.value`, 'must be null for no-data')
    if (metric.collectedAt !== null) {
      fail(`${path}.collectedAt`, 'must be null for no-data')
    }
    return {
      status: 'no-data',
      value: null,
      source: readSource(metric.source, `${path}.source`),
      collectedAt: null,
      updatedAt,
    }
  }

  if (metric.status === 'unavailable') {
    if (metric.value !== null) fail(`${path}.value`, 'must be null for unavailable')
    if (metric.collectedAt !== null) {
      fail(`${path}.collectedAt`, 'must be null for unavailable')
    }
    return {
      status: 'unavailable',
      value: null,
      source: metric.source === null
        ? null
        : readSource(metric.source, `${path}.source`),
      collectedAt: null,
      updatedAt,
    }
  }

  return fail(`${path}.status`, 'unknown health data status')
}

/** 将未知的 Native Bridge 输入转换为严格的 LifeOS normalized contract。 */
export function parseDailyHealthSummary(input: unknown): DailyHealthSummary {
  const summary = readObject(input, 'health')
  assertOnlyKeys(
    summary,
    [
      'date',
      'sleep',
      'restingHeartRate',
      'heartRateVariability',
      'steps',
      'activity',
    ],
    'health'
  )

  return {
    date: readLocalDate(summary.date, 'health.date'),
    sleep: readMetric<DailySleepValue>(summary.sleep, 'health.sleep', (value, path) =>
      readSingleValue(value, 'durationMinutes', path)
    ),
    restingHeartRate: readMetric<DailyRestingHeartRateValue>(
      summary.restingHeartRate,
      'health.restingHeartRate',
      (value, path) => readSingleValue(value, 'beatsPerMinute', path)
    ),
    heartRateVariability: readMetric<DailyHeartRateVariabilityValue>(
      summary.heartRateVariability,
      'health.heartRateVariability',
      (value, path) => readSingleValue(value, 'milliseconds', path)
    ),
    steps: readMetric<DailyStepsValue>(summary.steps, 'health.steps', (value, path) =>
      readSingleValue(value, 'count', path, true)
    ),
    activity: readMetric<DailyActivityValue>(
      summary.activity,
      'health.activity',
      (value, path) => readSingleValue(value, 'activeMinutes', path)
    ),
  }
}

/** 唯一外部写入入口：先校验并规范化，再交给 Repository 按日期 upsert。 */
export async function importDailyHealthSummary(
  input: unknown,
  repository: IHealthRepository = healthRepository
): Promise<DailyHealthSummary> {
  return repository.upsert(parseDailyHealthSummary(input))
}

/** 批量入口会先校验完整 payload，避免格式错误导致部分数据提前写入。 */
export async function importDailyHealthSummaries(
  input: unknown,
  repository: IHealthRepository = healthRepository
): Promise<DailyHealthSummary[]> {
  if (!Array.isArray(input)) {
    return fail('health', 'expected array of daily summaries')
  }

  const summaries = input.map(parseDailyHealthSummary)
  const imported: DailyHealthSummary[] = []
  for (const summary of summaries) {
    imported.push(await repository.upsert(summary))
  }
  return imported
}
