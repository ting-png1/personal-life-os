import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { IHealthRepository } from '../repository.ts'
import type { DailyHealthSummary } from '../types.ts'
import { importHealthFromNative } from './importFromNative.ts'
import {
  CapacitorHealthNativeBridge,
  NativeHealthCapabilityUnavailableError,
  WebHealthNativeBridge,
  createHealthNativeBridge,
  type HealthNativeBridge,
  type NativeHealthReadOptions,
} from './nativeBridge.ts'

function makeRawSummary(date: string): Record<string, unknown> {
  const updatedAt = `${date}T12:00:00+08:00`
  const source = { id: 'native-provider', label: 'Native provider' }
  return {
    date,
    sleep: {
      status: 'stale',
      value: { durationMinutes: 420 },
      source,
      collectedAt: `${date}T08:00:00+08:00`,
      updatedAt,
    },
    restingHeartRate: {
      status: 'no-data',
      value: null,
      source,
      collectedAt: null,
      updatedAt,
    },
    heartRateVariability: {
      status: 'unavailable',
      value: null,
      source: null,
      collectedAt: null,
      updatedAt,
    },
    steps: {
      status: 'available',
      value: { count: 5000 },
      source,
      collectedAt: `${date}T11:30:00+08:00`,
      updatedAt,
    },
    activity: {
      status: 'available',
      value: { activeMinutes: 30 },
      source,
      collectedAt: `${date}T11:30:00+08:00`,
      updatedAt,
    },
  }
}

function createRecordingRepository(): {
  repository: IHealthRepository
  records: Map<string, DailyHealthSummary>
} {
  const records = new Map<string, DailyHealthSummary>()
  return {
    records,
    repository: {
      async getByDate(date) {
        return records.get(date)
      },
      async getByDateRange() {
        return [...records.values()]
      },
      async upsert(summary) {
        records.set(summary.date, summary)
        return summary
      },
    },
  }
}

describe('Health Native Bridge foundation', () => {
  it('浏览器/PWA 明确降级为 native capability unavailable', async () => {
    const bridge = new WebHealthNativeBridge()
    assert.deepEqual(await bridge.getCapability(), {
      status: 'unavailable',
      reason: 'native-runtime-unavailable',
    })
    await assert.rejects(
      bridge.readDailySummaries({ startDate: '2026-09-01', endDate: '2026-09-01' }),
      NativeHealthCapabilityUnavailableError
    )

    assert.ok(createHealthNativeBridge() instanceof WebHealthNativeBridge)
  })

  it('Capacitor adapter 保持 provider-neutral contract 与 unknown payload', async () => {
    const payload = [makeRawSummary('2026-09-01')]
    const plugin = {
      async getCapability() {
        return { status: 'available', providerId: 'test-native-provider' }
      },
      async readDailySummaries(_options: NativeHealthReadOptions) {
        return payload
      },
    }
    const bridge = new CapacitorHealthNativeBridge(plugin, () => true)

    assert.deepEqual(await bridge.getCapability(), {
      status: 'available',
      providerId: 'test-native-provider',
    })
    assert.equal(
      await bridge.readDailySummaries({ startDate: '2026-09-01', endDate: '2026-09-01' }),
      payload
    )
  })

  it('unavailable 环境不读取 payload，也不写 Repository', async () => {
    let readCalled = false
    const bridge: HealthNativeBridge = {
      async getCapability() {
        return { status: 'unavailable', reason: 'provider-unavailable' }
      },
      async readDailySummaries() {
        readCalled = true
        return []
      },
    }
    const { repository, records } = createRecordingRepository()

    assert.deepEqual(
      await importHealthFromNative(
        bridge,
        { startDate: '2026-09-01', endDate: '2026-09-01' },
        repository
      ),
      { status: 'unavailable', importedCount: 0, reason: 'provider-unavailable' }
    )
    assert.equal(readCalled, false)
    assert.equal(records.size, 0)
  })

  it('native payload 只能经 Import Boundary 校验后写入 Repository', async () => {
    const valid = makeRawSummary('2026-09-01')
    const bridge: HealthNativeBridge = {
      async getCapability() {
        return { status: 'available', providerId: 'test-native-provider' }
      },
      async readDailySummaries() {
        return [valid]
      },
    }
    const { repository, records } = createRecordingRepository()

    assert.deepEqual(
      await importHealthFromNative(
        bridge,
        { startDate: '2026-09-01', endDate: '2026-09-01' },
        repository
      ),
      { status: 'imported', importedCount: 1 }
    )
    assert.equal(records.get('2026-09-01')?.sleep.status, 'stale')
    assert.equal(records.get('2026-09-01')?.steps.status, 'available')
  })

  it('批量 payload 任一项非法时整批不进入 Repository', async () => {
    const invalid = {
      ...makeRawSummary('2026-09-02'),
      rawSamples: [{ value: 1 }],
    }
    const bridge: HealthNativeBridge = {
      async getCapability() {
        return { status: 'available', providerId: 'test-native-provider' }
      },
      async readDailySummaries() {
        return [makeRawSummary('2026-09-01'), invalid]
      },
    }
    const { repository, records } = createRecordingRepository()

    await assert.rejects(
      importHealthFromNative(
        bridge,
        { startDate: '2026-09-01', endDate: '2026-09-02' },
        repository
      ),
      /unexpected field/
    )
    assert.equal(records.size, 0)
  })
})
