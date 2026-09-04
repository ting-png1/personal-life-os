import type {
  ProactiveCapabilityId,
  ProactiveReservationResult,
  ProactiveUsageLedger,
  ProactiveUsageSnapshot,
} from '../types.ts'

interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'lifeos_proactive_usage_v1'

function emptyUsage(
  capability: ProactiveCapabilityId,
  localDate: string,
): ProactiveUsageSnapshot {
  return { capability, localDate, attemptCount: 0, lastAttemptAt: null }
}

function parseUsage(value: unknown): ProactiveUsageSnapshot[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is ProactiveUsageSnapshot => {
    if (typeof item !== 'object' || item === null) return false
    const candidate = item as Record<string, unknown>
    return (
      candidate.capability === 'daily-review' &&
      typeof candidate.localDate === 'string' &&
      Number.isInteger(candidate.attemptCount) &&
      Number(candidate.attemptCount) >= 0 &&
      (candidate.lastAttemptAt === null ||
        (typeof candidate.lastAttemptAt === 'string' &&
          Number.isFinite(Date.parse(candidate.lastAttemptAt))))
    )
  })
}

/** Local technical ledger; it stores call attempts, never LifeOS facts/context. */
export class LocalProactiveUsageLedger implements ProactiveUsageLedger {
  private readonly storage: KeyValueStorage

  constructor(storage: KeyValueStorage) {
    this.storage = storage
  }

  private read(): ProactiveUsageSnapshot[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY)
      return raw ? parseUsage(JSON.parse(raw)) : []
    } catch {
      return []
    }
  }

  async reserve(input: {
    capability: ProactiveCapabilityId
    localDate: string
    attemptedAt: string
    minimumIntervalMinutes: number
    maxCallsPerLocalDay: number
  }): Promise<ProactiveReservationResult> {
    const records = this.read()
    const usage =
      records.find(
        (item) =>
          item.capability === input.capability && item.localDate === input.localDate,
      ) ?? emptyUsage(input.capability, input.localDate)

    if (usage.attemptCount >= input.maxCallsPerLocalDay) {
      return { allowed: false, reason: 'daily-call-budget', usage }
    }
    if (
      usage.lastAttemptAt !== null &&
      Date.parse(input.attemptedAt) - Date.parse(usage.lastAttemptAt) <
        input.minimumIntervalMinutes * 60_000
    ) {
      return { allowed: false, reason: 'frequency-limit', usage }
    }

    const reserved: ProactiveUsageSnapshot = {
      capability: input.capability,
      localDate: input.localDate,
      attemptCount: usage.attemptCount + 1,
      lastAttemptAt: input.attemptedAt,
    }
    const retained = records.filter(
      (item) =>
        item.localDate === input.localDate && item.capability !== input.capability,
    )
    this.storage.setItem(STORAGE_KEY, JSON.stringify([...retained, reserved]))
    return { allowed: true, usage: reserved }
  }
}
